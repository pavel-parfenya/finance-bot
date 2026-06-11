import { Subscription, SubscriptionPlan } from "../database/entities";
import type { SubscriptionService } from "./subscription-service";
import type { StrapiPlanConfig } from "../infrastructure/strapi/strapi-plan-config";
import { buildPaymentForm, type PaymentForm } from "../infrastructure/webpay/webpay-form";
import { verifyNotifySignature } from "../infrastructure/webpay/webpay-signature";

/** Конфигурация платёжного шлюза для PaymentService. */
export interface PaymentGatewayConfig {
  gateway: "webpay" | "test";
  webpay: {
    storeId: string;
    secretKey: string;
    formUrl: string;
    testMode: boolean;
    currency: string;
    returnUrl: string;
    cancelUrl: string;
    notifyUrl: string;
  };
}

/** Результат checkout: тест-режим (подписка уже оформлена) или редирект на WebPay. */
export type CheckoutResult =
  | { mode: "test"; subscription: Subscription }
  | { mode: "webpay"; form: PaymentForm };

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
 * - `webpay`: возвращает поля формы для редиректа на платёжный шлюз; фактическая
 *   активация подписки происходит в `handleNotify` (server-to-server webhook).
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

    const { storeId, secretKey } = this.cfg.webpay;
    if (!storeId || !secretKey) {
      throw new PaymentError("WebPay не настроен (WEBPAY_STORE_ID / WEBPAY_SECRET_KEY)");
    }

    const amount = await this.resolveAmount(plan);
    const orderNum = `${userId}-${PLAN_CODE[plan]}-${Date.now().toString(36)}`;
    const form = buildPaymentForm(
      {
        storeId,
        secretKey,
        formUrl: this.cfg.webpay.formUrl,
        testMode: this.cfg.webpay.testMode,
        returnUrl: this.cfg.webpay.returnUrl,
        cancelUrl: this.cfg.webpay.cancelUrl,
        notifyUrl: this.cfg.webpay.notifyUrl,
      },
      {
        orderNum,
        amount: amount.toFixed(2),
        currency: this.cfg.webpay.currency,
        description:
          plan === SubscriptionPlan.ProYear
            ? "Подписка Pro (год)"
            : "Подписка Pro (месяц)",
      }
    );
    return { mode: "webpay", form };
  }

  /**
   * Обработка notify-webhook от WebPay: проверка подписи + активация подписки.
   * Возвращает `activated`, чтобы вызывающий мог залогировать результат.
   */
  async handleNotify(
    payload: Record<string, unknown>
  ): Promise<{ received: boolean; activated: boolean }> {
    if (this.cfg.gateway !== "webpay") return { received: true, activated: false };

    const get = (k: string): string => {
      const v = payload[k];
      return typeof v === "string" ? v : v == null ? "" : String(v);
    };

    const valid = verifyNotifySignature(
      {
        batchTimestamp: get("batch_timestamp"),
        currencyId: get("currency_id"),
        amount: get("amount"),
        paymentMethod: get("payment_method"),
        orderId: get("order_id"),
        siteOrderId: get("site_order_id"),
        transactionId: get("transaction_id"),
        paymentType: get("payment_type"),
        rrn: get("rrn"),
        signature: get("wsb_signature"),
      },
      this.cfg.webpay.secretKey
    );
    if (!valid) return { received: true, activated: false };

    const orderNum = get("order_id");
    const parsed = parseOrder(orderNum);
    if (!parsed) return { received: true, activated: false };

    // activatePaid гасит ссылку (ставит linkRevokedAt) — одноразовость.
    await this.subscriptionService.activatePaid(parsed.userId, parsed.plan, {
      webpayOrderId: orderNum,
      paymentId: get("transaction_id") || null,
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
function parseOrder(orderNum: string): { userId: number; plan: SubscriptionPlan } | null {
  const parts = orderNum.split("-");
  if (parts.length < 2) return null;
  const userId = Number(parts[0]);
  const plan = CODE_PLAN[parts[1]];
  if (!Number.isInteger(userId) || userId <= 0 || !plan) return null;
  return { userId, plan };
}
