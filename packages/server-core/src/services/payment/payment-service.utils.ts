import { SubscriptionPlan } from "../../database/entities";

/** Однобуквенный код тарифа в номере заказа (чтобы восстановить план в notify). */
export const PLAN_CODE: Partial<Record<SubscriptionPlan, string>> = {
  [SubscriptionPlan.ProMonth]: "m",
  [SubscriptionPlan.ProYear]: "y",
};
const CODE_PLAN: Record<string, SubscriptionPlan> = {
  m: SubscriptionPlan.ProMonth,
  y: SubscriptionPlan.ProYear,
};

/** Интервал автосписания плана bePaid (год = 12 месяцев — unit `year` не поддерживается). */
export const PLAN_INTERVAL: Record<string, { interval: number; intervalUnit: "month" }> =
  {
    [SubscriptionPlan.ProMonth]: { interval: 1, intervalUnit: "month" },
    [SubscriptionPlan.ProYear]: { interval: 12, intervalUnit: "month" },
  };

export const PAID_PLANS = new Set<SubscriptionPlan>([
  SubscriptionPlan.ProMonth,
  SubscriptionPlan.ProYear,
]);

/** Состояния подписки bePaid, при которых оплаченный период действует. */
export const ACTIVE_STATES = new Set(["active", "trial"]);
/** Терминальные состояния bePaid — автопродление прекращено. */
export const CANCELED_STATES = new Set(["canceled", "failed"]);

/** Восстанавливает userId и план из номера заказа `<userId>-<code>`. */
export function parseOrder(
  orderNum: string
): { userId: number; plan: SubscriptionPlan } | null {
  const parts = orderNum.split("-");
  if (parts.length < 2) return null;
  const userId = Number(parts[0]);
  const plan = CODE_PLAN[parts[1]];
  if (!Number.isInteger(userId) || userId <= 0 || !plan) return null;
  return { userId, plan };
}
