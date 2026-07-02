import { Subscription, SubscriptionPlan } from "../../database/entities";
import type { SubscriptionService } from "../subscription/subscription-service";
import type { StrapiPlanConfig } from "../../infrastructure/strapi/strapi-plan-config";
import {
  ensurePlan,
  createSubscription,
  getSubscription,
  cancelSubscription,
  listSubscriptions,
} from "../../infrastructure/bepaid/bepaid-client";
import type { BepaidSubscriptionListItem } from "../../infrastructure/bepaid/bepaid-client.types";
import type { CheckoutResult, PaymentGatewayConfig } from "./payment-service.types";
import {
  PLAN_CODE,
  PLAN_INTERVAL,
  PAID_PLANS,
  ACTIVE_STATES,
  CANCELED_STATES,
  parseOrder,
  bepaidPlanTitle,
} from "./payment-service.utils";

export type { CheckoutResult, PaymentGatewayConfig };

export class PaymentError extends Error {}

/**
 * Оформление и сопровождение рекуррентных подписок.
 *
 * - `test`: оплата сразу считается успешной — подписка оформляется немедленно
 *   (без автопродления, т.к. bePaid не задействован).
 * - `bepaid`: создаёт план (или переиспользует существующий) и подписку bePaid,
 *   возвращает `redirect_url` для ввода карты. Дальше bePaid сам списывает оплату
 *   по расписанию плана; активация и продление подписки происходят в `handleNotify`
 *   (server-to-server webhook с проверкой состояния по API).
 */
export class PaymentService {
  /** Кэш id планов bePaid по их заголовку (план создаётся один раз на процесс). */
  private readonly planIdCache = new Map<string, string>();

  constructor(
    private readonly cfg: PaymentGatewayConfig,
    private readonly subscriptionService: SubscriptionService,
    private readonly planConfig: StrapiPlanConfig
  ) {}

  async checkout(userId: number, plan: SubscriptionPlan): Promise<CheckoutResult> {
    if (!PAID_PLANS.has(plan)) {
      throw new PaymentError("Недопустимый тариф для оплаты");
    }

    if (this.cfg.gateway === "test") {
      // activatePaid гасит ссылку (ставит linkRevokedAt) — одноразовость.
      const subscription = await this.subscriptionService.activatePaid(userId, plan);
      return { mode: "test", subscription };
    }

    const { shopId, secretKey } = this.cfg.bepaid;
    if (!shopId || !secretKey) {
      throw new PaymentError("bePaid не настроен (BEPAID_SHOP_ID / BEPAID_SECRET_KEY)");
    }

    const amount = await this.resolveAmount(plan);
    const amountMinor = Math.round(amount * 100);
    const planId = await this.ensurePlanId(plan, amountMinor);

    // Если у пользователя уже есть подписка bePaid — отменяем её, чтобы не было
    // двойных списаний после оформления новой. Если отменить не удалось и прежняя
    // подписка всё ещё активна — прерываемся (иначе появятся две списывающие
    // подписки); см. ensureBepaidCanceled.
    const existing = await this.subscriptionService.findCurrent(userId);
    if (existing?.bepaidSubscriptionId) {
      await this.ensureBepaidCanceled(existing.bepaidSubscriptionId);
    }

    const trackingId = `${userId}-${PLAN_CODE[plan]}`;
    const subscription = await createSubscription(this.cfg.bepaid, {
      planId,
      trackingId,
      notifyUrl: this.cfg.bepaid.notifyUrl,
      returnUrl: this.cfg.bepaid.returnUrl,
    });
    if (!subscription.redirectUrl) {
      throw new PaymentError("bePaid не вернул ссылку на оплату");
    }

    // Сохраняем id подписки до подтверждения оплаты (для отмены/поиска в webhook).
    await this.subscriptionService.setPendingBepaidSubscription(userId, {
      bepaidSubscriptionId: subscription.id,
      bepaidPlanId: planId,
    });

    return { mode: "redirect", redirectUrl: subscription.redirectUrl };
  }

  /**
   * Обработка notify-webhook от bePaid (создание/продление/отмена подписки).
   * Состояние подтверждается повторным запросом к bePaid (тело webhook не доверяем):
   * - `active`/`trial` → активируем/продлеваем подписку (срок = `active_to`);
   * - `canceled`/`failed` → помечаем отменённой (доступ до конца оплаченного периода).
   * Возвращает `activated`, чтобы вызывающий мог залогировать результат.
   */
  async handleNotify(
    payload: Record<string, unknown>
  ): Promise<{ received: boolean; activated: boolean }> {
    if (this.cfg.gateway !== "bepaid") return { received: true, activated: false };

    // Webhook подписки приходит плоско или обёрнутым в { subscription: {...} }.
    const obj =
      payload.subscription && typeof payload.subscription === "object"
        ? (payload.subscription as Record<string, unknown>)
        : payload;
    const id = typeof obj.id === "string" && obj.id.startsWith("sbs_") ? obj.id : null;
    if (!id) return { received: true, activated: false };

    // Источник истины — состояние из API bePaid, а не тело webhook.
    const verified = await getSubscription(this.cfg.bepaid, id);
    if (!verified) return { received: true, activated: false };

    const parsed = verified.trackingId ? parseOrder(verified.trackingId) : null;
    if (!parsed) return { received: true, activated: false };

    if (ACTIVE_STATES.has(verified.state)) {
      // activatePaid гасит ссылку (ставит linkRevokedAt) — одноразовость.
      await this.subscriptionService.activatePaid(parsed.userId, parsed.plan, {
        expiresAt: verified.activeTo,
        bepaidSubscriptionId: verified.id,
        bepaidPlanId: verified.planId,
        paymentId: verified.lastTransactionUid,
      });
      return { received: true, activated: true };
    }

    if (CANCELED_STATES.has(verified.state)) {
      await this.subscriptionService.cancelByBepaidId(verified.id);
    }
    return { received: true, activated: false };
  }

  /**
   * Список подписок магазина bePaid (для админ-панели). В тест-режиме шлюза
   * (без обращения к bePaid) возвращает пустой список.
   */
  async listBepaidSubscriptions(): Promise<BepaidSubscriptionListItem[]> {
    if (this.cfg.gateway !== "bepaid") return [];
    const { shopId, secretKey } = this.cfg.bepaid;
    if (!shopId || !secretKey) {
      throw new PaymentError("bePaid не настроен (BEPAID_SHOP_ID / BEPAID_SECRET_KEY)");
    }
    return listSubscriptions(this.cfg.bepaid);
  }

  /**
   * Отмена автопродления: останавливает подписку bePaid и помечает её отменённой.
   * Локальный статус ставится `canceled` только после подтверждённой остановки в
   * bePaid — иначе бросаем PaymentError, чтобы не показать «отменено», пока карту
   * продолжают списывать. Доступ сохраняется до конца оплаченного периода.
   */
  async cancelSubscription(userId: number): Promise<Subscription | null> {
    const sub = await this.subscriptionService.findCurrent(userId);
    if (this.cfg.gateway === "bepaid" && sub?.bepaidSubscriptionId) {
      await this.ensureBepaidCanceled(sub.bepaidSubscriptionId);
    }
    return this.subscriptionService.cancel(userId);
  }

  /**
   * Гарантирует остановку автопродления подписки bePaid. Пытается отменить; если
   * не вышло — перепроверяет состояние в bePaid и считает успехом только когда
   * подписка уже не активна. Иначе бросает PaymentError (списания могут
   * продолжаться — нельзя помечать подписку отменённой локально вслепую).
   */
  private async ensureBepaidCanceled(bepaidSubscriptionId: string): Promise<void> {
    const ok = await cancelSubscription(this.cfg.bepaid, bepaidSubscriptionId).catch(
      () => false
    );
    if (ok) return;

    const verified = await getSubscription(this.cfg.bepaid, bepaidSubscriptionId).catch(
      () => null
    );
    if (verified && !ACTIVE_STATES.has(verified.state)) return; // уже остановлена

    throw new PaymentError(
      "Не удалось отменить автопродление в платёжной системе. Попробуйте ещё раз позже."
    );
  }

  /** id плана bePaid для тарифа+цены: из кэша, иначе ищет/создаёт в bePaid. */
  private async ensurePlanId(
    plan: SubscriptionPlan,
    amountMinor: number
  ): Promise<string> {
    const { interval, intervalUnit } = PLAN_INTERVAL[plan];
    // Заголовок кодирует тариф+цену+валюту: смена цены → новый план.
    const title = bepaidPlanTitle(
      plan,
      amountMinor,
      this.cfg.bepaid.currency,
      this.cfg.bepaid.testMode
    );
    const cached = this.planIdCache.get(title);
    if (cached) return cached;

    const planId = await ensurePlan(this.cfg.bepaid, {
      title,
      amountMinor,
      currency: this.cfg.bepaid.currency,
      interval,
      intervalUnit,
    });
    this.planIdCache.set(title, planId);
    return planId;
  }

  /** Цена тарифа из Strapi (BYN). Бросает, если тариф/цена не сконфигурированы. */
  private async resolveAmount(plan: SubscriptionPlan): Promise<number> {
    const plans = await this.planConfig.getPlans();
    const card = plans?.find((p) => p.planId === plan);
    if (!card || card.price == null || !Number.isFinite(card.price) || card.price <= 0) {
      throw new PaymentError("Цена тарифа не задана в Strapi — оплата недоступна");
    }
    return card.price;
  }
}
