import type { SubscriptionPlan } from "../../database/entities";

/**
 * Причина отмены подписки:
 * - `user` — пользователь сам выключил автопродление (лендинг/Mini App);
 * - `bepaid` — подписка отменена на стороне bePaid (notify-webhook);
 * - `payment_failed` — исчерпаны попытки очередного списания (state `failed`).
 */
export type SubscriptionCancelReason = "user" | "bepaid" | "payment_failed";

export interface SubscriptionPaidEvent {
  userId: number;
  plan: SubscriptionPlan;
  expiresAt: Date | null;
  /** Продление уже активной подписки (очередное списание), а не новая покупка. */
  renewal?: boolean;
  /** Тестовая оплата (test-шлюз или bePaid в testMode) — деньги не списывались. */
  test?: boolean;
}

export interface SubscriptionCanceledEvent {
  userId: number;
  plan: SubscriptionPlan;
  /** Конец оплаченного периода — до него доступ сохраняется. */
  expiresAt: Date | null;
  reason: SubscriptionCancelReason;
}
