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

  for (const t of transactions) {
    const amt = Number(t.amount);
    const cur = t.currency || "USD";
    const r = rates[cur] ?? 1;
    const amtInDefault = (amt / r) * defRate;

    byCurrencyMap.set(cur, (byCurrencyMap.get(cur) || 0) + amt);
    const key = t.category || "Без категории";
    byCategoryMap.set(key, (byCategoryMap.get(key) || 0) + amtInDefault);
  }

  let totalInDefault = 0;
  for (const [, sum] of byCategoryMap) {
    totalInDefault += sum;
  }

  const byCurrency = Array.from(byCurrencyMap.entries())
    .map(([currency, amount]) => ({ currency, amount: String(amount.toFixed(2)) }))
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, amount]) => ({ category, amount: String(amount.toFixed(2)) }))
    .sort((a, b) => Number(b.amount) - Number(a.amount));

  return {
    byCategory,
    byCurrency,
    totalInDefault: totalInDefault.toFixed(2),
  };
}
