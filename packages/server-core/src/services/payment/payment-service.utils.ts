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

/** Человекочитаемое имя тарифа — показывается на форме оплаты bePaid. */
const PLAN_TITLE: Partial<Record<SubscriptionPlan, string>> = {
  [SubscriptionPlan.ProMonth]: "Pro на месяц",
  [SubscriptionPlan.ProYear]: "Pro на год",
};

/** Человекочитаемое имя тарифа (уведомления, сообщения). */
export function planTitle(plan: SubscriptionPlan): string {
  return PLAN_TITLE[plan] ?? String(plan);
}

/**
 * Заголовок плана bePaid: человекочитаемое имя тарифа + цена/валюта.
 * По заголовку план ищется для идемпотентности, поэтому в него закодированы:
 * - цена: смена цены → новый заголовок → новый план (старый не переопределяется);
 * - тестовость (`testMode`): тестовые и боевые планы имеют разные заголовки и
 *   никогда не переиспользуются друг вместо друга (флаг `test` у плана bePaid
 *   ставится один раз при создании и позже не меняется — переключение
 *   PAYMENT_MODE=paid НЕ превращает уже созданный тестовый план в боевой).
 */
export function bepaidPlanTitle(
  plan: SubscriptionPlan,
  amountMinor: number,
  currency: string,
  testMode: boolean
): string {
  const name = PLAN_TITLE[plan] ?? `fb-${plan}`;
  const amount = (amountMinor / 100).toFixed(2).replace(/\.?0+$/, "");
  return `${name} — ${amount} ${currency}${testMode ? " (тест)" : ""}`;
}

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
