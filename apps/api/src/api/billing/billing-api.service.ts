import { BadRequestException, Injectable } from "@nestjs/common";
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionService,
  UserService,
  PaymentService,
  PaymentError,
  resolveEffectivePlan,
} from "@finance-bot/server-core";
import type { BillingUser } from "./billing-user.types";

const PAID_PLANS = new Set<SubscriptionPlan>([
  SubscriptionPlan.ProMonth,
  SubscriptionPlan.ProYear,
]);

function isValidPlan(plan: unknown): plan is SubscriptionPlan {
  return (
    plan === SubscriptionPlan.Free ||
    plan === SubscriptionPlan.ProMonth ||
    plan === SubscriptionPlan.ProYear
  );
}

/** Публичная форма подписки для лендинга/Mini App. */
function serializeSubscription(sub: Subscription) {
  const effectivePlan = resolveEffectivePlan(sub);
  // Понижение запланировано: куплен платный тариф, он отменён, но оплаченный
  // период ещё не закончился — фичи Pro действуют до expiresAt, затем Free.
  const downgradeScheduled =
    sub.status === SubscriptionStatus.Canceled && effectivePlan !== SubscriptionPlan.Free;
  return {
    plan: sub.plan,
    effectivePlan,
    downgradeScheduled,
    status: sub.status,
    startsAt: sub.startsAt ? sub.startsAt.toISOString() : null,
    expiresAt: sub.expiresAt ? sub.expiresAt.toISOString() : null,
  };
}

@Injectable()
export class BillingApiService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly userService: UserService,
    private readonly paymentService: PaymentService
  ) {}

  /** Данные для страницы /subscribe лендинга: пользователь + текущая подписка. */
  async getMe(billingUser: BillingUser) {
    const user = await this.userService.findById(billingUser.userId);
    const subscription = await this.subscriptionService.getCurrentOrFree(
      billingUser.userId
    );
    return {
      user: {
        id: billingUser.userId,
        telegramId: billingUser.telegramId,
        username: billingUser.username,
        defaultCurrency: user?.defaultCurrency ?? null,
      },
      subscription: serializeSubscription(subscription),
    };
  }

  async getSubscription(billingUser: BillingUser) {
    const subscription = await this.subscriptionService.getCurrentOrFree(
      billingUser.userId
    );
    return serializeSubscription(subscription);
  }

  /**
   * Создать сессию оплаты.
   * - `test`-шлюз: подписка оформляется сразу, фронту возвращается `mode: "test"`.
   * - `webpay`-шлюз: возвращаются поля формы (`mode: "webpay"`) для редиректа на WebPay.
   */
  async checkout(billingUser: BillingUser, plan: unknown) {
    if (!isValidPlan(plan) || !PAID_PLANS.has(plan)) {
      throw new BadRequestException({ error: "Недопустимый тариф для оплаты" });
    }
    try {
      const result = await this.paymentService.checkout(billingUser.userId, plan);
      if (result.mode === "test") {
        return {
          ok: true,
          mode: "test" as const,
          message: "Оплата прошла успешно (тестовый режим). Подписка оформлена.",
          subscription: serializeSubscription(result.subscription),
        };
      }
      return {
        ok: true,
        mode: "webpay" as const,
        form: result.form,
      };
    } catch (e) {
      if (e instanceof PaymentError) {
        throw new BadRequestException({ error: e.message });
      }
      throw e;
    }
  }

  async changePlan(billingUser: BillingUser, plan: unknown) {
    if (!isValidPlan(plan)) {
      throw new BadRequestException({ error: "Недопустимый тариф" });
    }
    const subscription = await this.subscriptionService.changePlan(
      billingUser.userId,
      plan
    );
    return serializeSubscription(subscription);
  }

  async cancel(billingUser: BillingUser) {
    const subscription = await this.subscriptionService.cancel(billingUser.userId);
    if (!subscription) {
      return { ok: true, subscription: null };
    }
    return { ok: true, subscription: serializeSubscription(subscription) };
  }

  /**
   * Webhook (notify-url) WebPay: проверка подписи и активация подписки.
   * Всегда отвечаем 200, чтобы платёжная система не ретраила бесконечно.
   */
  async handleWebhook(payload: unknown) {
    const body =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const result = await this.paymentService.handleNotify(body);
    return { received: result.received };
  }
}
