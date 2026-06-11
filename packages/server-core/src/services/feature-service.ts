import type {
  FeatureKey,
  SubscriptionPlanCard,
  SubscriptionPlanId,
} from "@finance-bot/shared";
import { resolveEffectivePlan, type SubscriptionService } from "./subscription-service";
import type { StrapiPlanConfig } from "../infrastructure/strapi/strapi-plan-config";

/**
 * Гейтинг функций по фичам тарифа. Источник истины — Strapi (через `StrapiPlanConfig`).
 *
 * Мягкая деградация: доступ открыт (все фичи), если
 *  - монетизация выключена (`paymentMode !== "paid"`),
 *  - конфиг Strapi недоступен (нет связи и нет кэша),
 *  - план пользователя вовсе не сконфигурирован в Strapi.
 * Гейтинг реально блокирует только когда план есть в конфиге и нужной фичи в нём нет.
 */
export class FeatureService {
  constructor(
    private readonly paymentMode: "free" | "paid",
    private readonly subscriptionService: SubscriptionService,
    private readonly planConfig: StrapiPlanConfig
  ) {}

  /** Полный список тарифов из Strapi (для страницы «Подписка»). `null` — конфиг недоступен. */
  async getPlans(): Promise<SubscriptionPlanCard[] | null> {
    return this.planConfig.getPlans();
  }

  /** Есть ли у пользователя доступ к фиче по его текущему тарифу. */
  async hasFeature(userId: number, key: FeatureKey): Promise<boolean> {
    if (this.paymentMode !== "paid") return true;
    const map = await this.planConfig.getPlanFeatureMap();
    if (!map) return true; // конфиг недоступен — не блокируем
    const sub = await this.subscriptionService.getCurrentOrFree(userId);
    const set = map.get(resolveEffectivePlan(sub) as SubscriptionPlanId);
    if (!set) return true; // план не сконфигурирован — не блокируем
    return set.has(key);
  }

  /**
   * Набор фич пользователя. `null` — доступ ко всему (монетизация выключена,
   * конфиг недоступен или план не сконфигурирован).
   */
  async getUserFeatures(userId: number): Promise<Set<FeatureKey> | null> {
    if (this.paymentMode !== "paid") return null;
    const map = await this.planConfig.getPlanFeatureMap();
    if (!map) return null;
    const sub = await this.subscriptionService.getCurrentOrFree(userId);
    return map.get(resolveEffectivePlan(sub) as SubscriptionPlanId) ?? null;
  }
}
