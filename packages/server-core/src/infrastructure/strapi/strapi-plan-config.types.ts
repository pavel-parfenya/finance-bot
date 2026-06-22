import type { FeatureKey, SubscriptionPlanId } from "@finance-bot/shared";

/** Карта `planId → набор ключей фич` для гейтинга по тарифу. */
export type PlanFeatureMap = Map<SubscriptionPlanId, Set<FeatureKey>>;
