import { Injectable } from "@nestjs/common";
import { SubscriptionService, FeatureService } from "@finance-bot/server-core";
import type { SubscriptionInfo, SubscriptionPlansResponse } from "@finance-bot/shared";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

/** Подписка пользователя для страницы «Подписка» в Mini App (auth — init-data). */
@Injectable()
export class SubscriptionApiService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly featureService: FeatureService
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
}
