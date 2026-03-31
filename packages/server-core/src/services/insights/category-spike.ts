import type { Insight } from "../../analytics/types";

const SPIKE_THRESHOLD_PERCENT = 40;

export function detectCategorySpike(
  byCategory: Array<{ category: string; amount: string }>,
  totalInDefault: number,
  defaultCurrency: string
): Insight | null {
  if (byCategory.length === 0 || totalInDefault <= 0) return null;

  const top = byCategory[0];
  const amount = Number(top.amount);
  const percent = (amount / totalInDefault) * 100;

  if (percent < SPIKE_THRESHOLD_PERCENT) return null;

  return {
    type: "category_spike",
    data: {
      category: top.category,
      amount: amount.toFixed(2),
      percent: Math.round(percent),
      currency: defaultCurrency,
    },
    priority: 3,
  };
}
