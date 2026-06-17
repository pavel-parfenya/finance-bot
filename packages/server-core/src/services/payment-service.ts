import { Subscription, SubscriptionPlan } from "../database/entities";
import type { SubscriptionService } from "./subscription-service";
import type { StrapiPlanConfig } from "../infrastructure/strapi/strapi-plan-config";
import {
  createCheckout,
  getTransactionStatus,
  type BepaidConfig,
} from "../infrastructure/bepaid/bepaid-client";

/** Конфигурация платёжного шлюза для PaymentService. */
export interface PaymentGatewayConfig {
  gateway: "bepaid" | "test";
  bepaid: BepaidConfig & {
    returnUrl: string;
    cancelUrl: string;
    notifyUrl: string;
  };
}

/** Результат checkout: тест-режим (подписка уже оформлена) или токен виджета bePaid. */
export type CheckoutResult =
  | { mode: "test"; subscription: Subscription }
  | { mode: "widget"; token: string; checkoutUrl: string; test: boolean };

export class PaymentError extends Error {}

/** Однобуквенный код тарифа в номере заказа (чтобы восстановить план в notify). */
const PLAN_CODE: Partial<Record<SubscriptionPlan, string>> = {
  [SubscriptionPlan.ProMonth]: "m",
  [SubscriptionPlan.ProYear]: "y",
};
const CODE_PLAN: Record<string, SubscriptionPlan> = {
  m: SubscriptionPlan.ProMonth,
  y: SubscriptionPlan.ProYear,
};

const PAID_PLANS = new Set<SubscriptionPlan>([
  SubscriptionPlan.ProMonth,
  SubscriptionPlan.ProYear,
]);

/**
 * Оформление оплаты подписки.
 *
 * - `test`: оплата сразу считается успешной — подписка оформляется немедленно.
 * - `bepaid`: возвращает токен для виджета bePaid; фактическая активация подписки
 *   происходит в `handleNotify` (server-to-server webhook с проверкой статуса по API).
 */
export class PaymentService {
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
    const orderNum = `${userId}-${PLAN_CODE[plan]}-${Date.now().toString(36)}`;
    const checkout = await createCheckout(this.cfg.bepaid, {
      trackingId: orderNum,
      amountMinor: Math.round(amount * 100),
      description:
        plan === SubscriptionPlan.ProYear ? "Подписка Pro (год)" : "Подписка Pro (месяц)",
      returnUrl: this.cfg.bepaid.returnUrl,
      notifyUrl: this.cfg.bepaid.notifyUrl,
    });
    return {
      mode: "widget",
      token: checkout.token,
      checkoutUrl: this.cfg.bepaid.checkoutBaseUrl,
      test: this.cfg.bepaid.testMode,
    };
  }

  /**
   * Обработка notify-webhook от bePaid: статус транзакции подтверждается повторным
   * запросом к bePaid (тело webhook не доверяем), затем активируется подписка.
   * Возвращает `activated`, чтобы вызывающий мог залогировать результат.
   */
  async handleNotify(
    payload: Record<string, unknown>
  ): Promise<{ received: boolean; activated: boolean }> {
    if (this.cfg.gateway !== "bepaid") return { received: true, activated: false };

    const tx =
      payload.transaction && typeof payload.transaction === "object"
        ? (payload.transaction as Record<string, unknown>)
        : null;
    const uid = tx && typeof tx.uid === "string" ? tx.uid : null;
    if (!uid) return { received: true, activated: false };

    // Источник истины — статус из API bePaid, а не тело webhook.
    const verified = await getTransactionStatus(this.cfg.bepaid, uid);
    if (!verified || verified.status !== "successful") {
      return { received: true, activated: false };
    }

    const orderNum =
      verified.trackingId ??
      (typeof tx?.tracking_id === "string" ? tx.tracking_id : null);
    const parsed = orderNum ? parseOrder(orderNum) : null;
    if (!parsed) return { received: true, activated: false };

    // activatePaid гасит ссылку (ставит linkRevokedAt) — одноразовость.
    await this.subscriptionService.activatePaid(parsed.userId, parsed.plan, {
      webpayOrderId: parsed.orderNum,
      paymentId: verified.uid,
    });
    return { received: true, activated: true };
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

/** Восстанавливает userId и план из номера заказа `<userId>-<code>-<ts>`. */
function parseOrder(
  orderNum: string
): { userId: number; plan: SubscriptionPlan; orderNum: string } | null {
  const parts = orderNum.split("-");
  if (parts.length < 2) return null;
  const userId = Number(parts[0]);
  const plan = CODE_PLAN[parts[1]];
  if (!Number.isInteger(userId) || userId <= 0 || !plan) return null;
  return { userId, plan, orderNum };
}
