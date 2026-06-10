export type SubscriptionPlanId = "free" | "pro_month" | "pro_year";
export type SubscriptionStatusId = "active" | "canceled" | "expired" | "past_due";

/** Текущее состояние подписки пользователя (страница «Подписка» в Mini App). */
export interface SubscriptionInfo {
  plan: SubscriptionPlanId;
  status: SubscriptionStatusId;
  startsAt: string | null;
  expiresAt: string | null;
}

/** Одна фича тарифа (из Strapi): машинный ключ + отображаемое название. */
export interface PlanFeatureItem {
  key: string;
  label: string;
}

/** Карточка тарифа для страницы «Подписка» (данные из Strapi). */
export interface SubscriptionPlanCard {
  planId: SubscriptionPlanId | null;
  name: string;
  price: number | null;
  period: "month" | "year" | "once" | null;
  features: PlanFeatureItem[];
  isPopular: boolean;
  ctaText: string;
  sortOrder: number;
}

/** Ответ `GET /api/subscription/plans`: тарифы из Strapi + текущий план и доступные фичи юзера. */
export interface SubscriptionPlansResponse {
  current: SubscriptionInfo;
  /**
   * Ключи фич, доступных пользователю в его текущем тарифе.
   * `null` — доступ ко всему (free-режим монетизации или конфиг Strapi недоступен).
   */
  currentFeatureKeys: string[] | null;
  plans: SubscriptionPlanCard[];
}
