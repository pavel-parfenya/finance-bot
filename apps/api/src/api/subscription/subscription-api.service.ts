import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import {
  SubscriptionService,
  FeatureService,
  BillingTokenService,
  UserService,
  PaymentService,
  PaymentError,
  config,
} from "@finance-bot/server-core";
import type { SubscriptionInfo, SubscriptionPlansResponse } from "@finance-bot/shared";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

/** Подписка пользователя для страницы «Подписка» в Mini App (auth — init-data). */
@Injectable()
export class SubscriptionApiService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly featureService: FeatureService,
    private readonly billingTokenService: BillingTokenService,
    private readonly userService: UserService,
    private readonly paymentService: PaymentService
  ) {}

  async getCurrent(resolved: ResolvedTelegramUser): Promise<SubscriptionInfo> {
    const sub = await this.subscriptionService.getCurrentOrFree(resolved.userId);
    return {
      plan: sub.plan as SubscriptionInfo["plan"],
      status: sub.status as SubscriptionInfo["status"],
      startsAt: sub.startsAt ? sub.startsAt.toISOString() : null,
      expiresAt: sub.expiresAt ? sub.expiresAt.toISOString() : null,
    };
  }

  /** Тарифы из Strapi + текущий план и доступные фичи пользователя. */
  async getPlansOverview(
    resolved: ResolvedTelegramUser
  ): Promise<SubscriptionPlansResponse> {
    const [current, plans, userFeatures] = await Promise.all([
      this.getCurrent(resolved),
      this.featureService.getPlans(),
      this.featureService.getUserFeatures(resolved.userId),
    ]);
    return {
      current,
      currentFeatureKeys: userFeatures ? Array.from(userFeatures) : null,
      plans: plans ?? [],
    };
  }

  /**
   * Ссылка на страницу оплаты лендинга с короткоживущим billing-JWT.
   * Mini App открывает её во внешнем браузере, где пользователь выбирает тариф и платит.
   */
  async getCheckoutLink(resolved: ResolvedTelegramUser): Promise<{ url: string }> {
    if (!this.billingTokenService.isConfigured) {
      throw new InternalServerErrorException({
        error: "Оплата временно недоступна (не настроен BILLING_JWT_SECRET).",
      });
    }
    const user = await this.userService.findById(resolved.userId);
    if (!user) {
      throw new InternalServerErrorException({ error: "Пользователь не найден." });
    }
    const token = this.billingTokenService.sign(Number(user.telegramId));
    const url = `${config.landingBaseUrl}/subscribe?token=${encodeURIComponent(token)}`;
    return { url };
  }

  /**
   * Отмена подписки со страницы «Подписка» в Mini App. Останавливает автопродление
   * в bePaid и помечает подписку отменённой; доступ сохраняется до конца оплаченного
   * периода. Возвращает актуальное состояние подписки для обновления экрана.
   */
  async cancel(resolved: ResolvedTelegramUser): Promise<SubscriptionInfo> {
    try {
      await this.paymentService.cancelSubscription(resolved.userId);
    } catch (e) {
      if (e instanceof PaymentError) {
        throw new BadRequestException({ error: e.message });
      }
      throw e;
    }
    return this.getCurrent(resolved);
  }
}
