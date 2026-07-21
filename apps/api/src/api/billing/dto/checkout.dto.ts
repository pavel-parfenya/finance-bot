import { SubscriptionPlan } from "@finance-bot/server-core";

export interface CheckoutDto {
  plan: SubscriptionPlan;
  /** event_id браузерного InitiateCheckout — для дедупликации Pixel + Conversions API. */
  metaEventId?: string;
  /** Cookie `_fbp` (browser id Meta) — матчинг серверных событий. */
  fbp?: string;
  /** Cookie `_fbc` (click id рекламной кампании Meta). */
  fbc?: string;
}
