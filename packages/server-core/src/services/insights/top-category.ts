import type { Insight } from "../../analytics/types";

export function detectTopCategory(
  byCategory: Array<{ category: string; amount: string }>,
  defaultCurrency: string
): Insight | null {
  if (byCategory.length === 0) return null;

  const top = byCategory[0];
  return {
    type: "top_category",
    data: {
      category: top.category,
      amount: top.amount,
      currency: defaultCurrency,
    },
    priority: 1,
  };
}
