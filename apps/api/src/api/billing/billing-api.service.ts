import { BadRequestException, Injectable } from "@nestjs/common";
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionService,
  UserService,
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
  return {
    plan: sub.plan,
    status: sub.status,
    startsAt: sub.startsAt ? sub.startsAt.toISOString() : null,
    expiresAt: sub.expiresAt ? sub.expiresAt.toISOString() : null,
  };
}

@Injectable()
export class BillingApiService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly userService: UserService
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
   * Создать сессию оплаты. Реальная интеграция с WebPay — Sprint 4.
   * Сейчас валидирует тариф и возвращает заглушку, чтобы фронт мог развиваться.
   */
  async checkout(billingUser: BillingUser, plan: unknown) {
    if (!isValidPlan(plan) || !PAID_PLANS.has(plan)) {
      throw new BadRequestException({ error: "Недопустимый тариф для оплаты" });
    }
    return {
      ok: true,
      plan,
      userId: billingUser.userId,
      // Sprint 4: redirectUrl от WebPay
      redirectUrl: null,
      message: "Платёжный шлюз подключается в следующем спринте (WebPay).",
    };
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
   * Webhook платёжной системы. Полная обработка (проверка подписи, обновление
   * подписки, сохранение recurringToken) — Sprint 4.
   */
  async handleWebhook(_payload: unknown) {
    return { received: true };
  }
}
