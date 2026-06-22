import type {
  FeatureKey,
  PlanFeatureItem,
  SubscriptionPlanCard,
  SubscriptionPlanId,
} from "@finance-bot/shared";
import { isFeatureKey } from "@finance-bot/shared";
import type { PlanFeatureMap } from "./strapi-plan-config.types";

export type { PlanFeatureMap };

/**
 * Read-only чтение конфигурации тарифов из Strapi (источник истины).
 *
 * Отдаёт полный список тарифов (`getPlans`) для страницы «Подписка» и
 * производную карту `planId → набор ключей фич` (`getPlanFeatureMap`) для гейтинга.
 * Если Strapi недоступен и кэша ещё нет — возвращает `null` (сигнал «конфиг
 * недоступен», обрабатывается выше как полный доступ, чтобы не ломать пользователей).
 */

/** Strapi v5 отдаёт связи плоско, v4 — через `{ data: [{ attributes }] }`. */
function unwrap(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && "attributes" in value) {
    return (value as { attributes: Record<string, unknown> }).attributes;
  }
  return (value as Record<string, unknown>) ?? {};
}

function extractFeatures(planFeatures: unknown): PlanFeatureItem[] {
  const list = Array.isArray(planFeatures)
    ? planFeatures
    : planFeatures &&
        typeof planFeatures === "object" &&
        Array.isArray((planFeatures as { data?: unknown[] }).data)
      ? (planFeatures as { data: unknown[] }).data
      : [];
  return list
    .map((item) => {
      const attrs = unwrap(item);
      return {
        key: typeof attrs["key"] === "string" ? (attrs["key"] as string) : null,
        label: typeof attrs["label"] === "string" ? (attrs["label"] as string) : null,
        sortOrder:
          typeof attrs["sortOrder"] === "number" ? (attrs["sortOrder"] as number) : 0,
      };
    })
    .filter((f): f is { key: string; label: string; sortOrder: number } =>
      Boolean(f.key && f.label)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((f) => ({ key: f.key, label: f.label }));
}

/**
 * Fallback-фичи из json-поля `features` (массив строк-подписей без машинных ключей).
 * Используются для отображения, когда связь `planFeatures` не заполнена. Ключ = подпись:
 * для гейтинга такие ключи отсеиваются `isFeatureKey`, так что на блокировки не влияют.
 */
function extractJsonFeatures(features: unknown): PlanFeatureItem[] {
  if (!Array.isArray(features)) return [];
  return features
    .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
    .map((label) => ({ key: label, label }));
}

/** Запасной вывод planId из цены/периода, если поле planId не заполнено. */
function resolvePlanId(price: unknown, period: unknown): SubscriptionPlanId | null {
  const p = typeof price === "number" ? price : Number(price);
  if (Number.isFinite(p) && p === 0) return "free";
  if (period === "year") return "pro_year";
  if (period === "month") return "pro_month";
  return null;
}

export class StrapiPlanConfig {
  private cache: SubscriptionPlanCard[] | null = null;
  private fetchedAt = 0;
  private readonly ttlMs = 60_000;

  constructor(private readonly strapiApiUrl: string) {}

  /** Полный список тарифов из Strapi. `null` — конфиг недоступен (Strapi недоступен и нет кэша). */
  async getPlans(): Promise<SubscriptionPlanCard[] | null> {
    const now = Date.now();
    if (this.cache && now - this.fetchedAt < this.ttlMs) return this.cache;
    try {
      const plans = await this.fetchPlans();
      this.cache = plans;
      this.fetchedAt = now;
      return plans;
    } catch {
      // Возвращаем последний удачный кэш, если он есть; иначе null (деградация).
      return this.cache;
    }
  }

  /** Карта planId → ключи фич (для гейтинга). `null` — конфиг недоступен. */
  async getPlanFeatureMap(): Promise<PlanFeatureMap | null> {
    const plans = await this.getPlans();
    if (!plans) return null;
    const map: PlanFeatureMap = new Map();
    for (const plan of plans) {
      if (!plan.planId) continue;
      const keys = plan.features
        .map((f) => f.key)
        .filter((k): k is FeatureKey => isFeatureKey(k));
      map.set(plan.planId, new Set(keys));
    }
    return map;
  }

  private async fetchPlans(): Promise<SubscriptionPlanCard[]> {
    const res = await fetch(
      `${this.strapiApiUrl}/api/pricings?populate=planFeatures&sort=sortOrder&pagination[pageSize]=100`
    );
    if (!res.ok) throw new Error(`Strapi pricings ${String(res.status)}`);
    const json = (await res.json()) as { data?: unknown[] };
    const rows = Array.isArray(json.data) ? json.data : [];
    return rows.map((row) => {
      const attrs = unwrap(row);
      const planId =
        (typeof attrs["planId"] === "string"
          ? (attrs["planId"] as SubscriptionPlanId)
          : null) ?? resolvePlanId(attrs["price"], attrs["period"]);
      const price =
        attrs["price"] == null || attrs["price"] === "" ? null : Number(attrs["price"]);
      // Источник истины для фич — связь planFeatures; json features оставляем как fallback.
      const relationFeatures = extractFeatures(attrs["planFeatures"]);
      const features =
        relationFeatures.length > 0
          ? relationFeatures
          : extractJsonFeatures(attrs["features"]);
      return {
        planId,
        name: typeof attrs["name"] === "string" ? (attrs["name"] as string) : "",
        price: price != null && Number.isFinite(price) ? price : null,
        period: (attrs["period"] as SubscriptionPlanCard["period"]) ?? null,
        features,
        isPopular: attrs["isPopular"] === true,
        ctaText: typeof attrs["ctaText"] === "string" ? (attrs["ctaText"] as string) : "",
        sortOrder:
          typeof attrs["sortOrder"] === "number" ? (attrs["sortOrder"] as number) : 0,
      };
    });
  }
}
