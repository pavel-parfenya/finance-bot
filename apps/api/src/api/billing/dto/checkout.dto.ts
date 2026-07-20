import { SubscriptionPlan } from "@finance-bot/server-core";

export interface CheckoutDto {
  plan: SubscriptionPlan;
  /** Cookie `_fbp` (browser id Meta) — матчинг события Subscribe (Meta CAPI) из webhook оплаты. */
  fbp?: string;
  /** Cookie `_fbc` (click id рекламной кампании Meta). */
  fbc?: string;
}
