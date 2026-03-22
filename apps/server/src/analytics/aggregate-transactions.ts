import type { TransactionForAggregation } from "./types";
import type { AggregatedAnalytics } from "./types";

/**
 * Агрегирует транзакции по категориям (в defaultCurrency) и по валютам (в нативной).
 * Переиспользуется в handleAnalytics (API) и insight-service.
 */
export function aggregateByCategoryAndCurrency(
  transactions: TransactionForAggregation[],
  rates: Record<string, number>,
  defaultCurrency: string
): AggregatedAnalytics {
  const byCurrencyMap = new Map<string, number>();
  const byCategoryMap = new Map<string, number>();
  const defRate = rates[defaultCurrency] ?? 1;
  let totalIncomeInDefault = 0;
  let totalExpenseInDefault = 0;

  for (const t of transactions) {
    const amt = Number(t.amount);
    const isIncome = t.type === "income";
    const signedAmt = isIncome ? amt : -amt;

    const cur = t.currency || "USD";
    const r = rates[cur] ?? 1;
    const amtInDefault = (amt / r) * defRate;
    if (isIncome) totalIncomeInDefault += amtInDefault;
    else totalExpenseInDefault += amtInDefault;

    byCurrencyMap.set(cur, (byCurrencyMap.get(cur) || 0) + signedAmt);
    const key = t.category || "Без категории";
    byCategoryMap.set(
      key,
      (byCategoryMap.get(key) || 0) + (isIncome ? amtInDefault : -amtInDefault)
    );
  }

  const hasIncome = totalIncomeInDefault > 0;

  let totalInDefault: number;
  let byCurrency: Array<{ currency: string; amount: string }>;
  let byCategory: Array<{ category: string; amount: string }>;

  if (hasIncome) {
    totalInDefault = totalIncomeInDefault - totalExpenseInDefault;
    byCurrency = Array.from(byCurrencyMap.entries())
      .map(([currency, amount]) => ({ currency, amount: String(amount.toFixed(2)) }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));
    byCategory = Array.from(byCategoryMap.entries())
      .map(([category, amount]) => ({ category, amount: String(amount.toFixed(2)) }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  } else {
    totalInDefault = totalExpenseInDefault;
    byCurrency = Array.from(byCurrencyMap.entries())
      .map(([currency, amount]) => ({
        currency,
        amount: String(Math.abs(amount).toFixed(2)),
      }))
      .filter((c) => Number(c.amount) > 0)
      .sort((a, b) => Number(b.amount) - Number(a.amount));
    byCategory = Array.from(byCategoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: String(Math.abs(amount).toFixed(2)),
      }))
      .filter((c) => Number(c.amount) > 0)
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  }

  return {
    byCategory,
    byCurrency,
    totalInDefault: totalInDefault.toFixed(2),
    totalIncomeInDefault: totalIncomeInDefault.toFixed(2),
    totalExpenseInDefault: totalExpenseInDefault.toFixed(2),
    hasIncome,
  };
}
