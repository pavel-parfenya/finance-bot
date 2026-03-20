import type { Insight } from "../../analytics/types";

const TOTAL_DELTA_THRESHOLD_PERCENT = 10;
const CATEGORY_DELTA_THRESHOLD_PERCENT = 20;
const CATEGORY_DELTA_MIN_AMOUNT = 100;

export function detectVsPrevMonthTotal(
  currentTotal: number,
  prevTotal: number,
  defaultCurrency: string
): Insight | null {
  if (prevTotal <= 0) return null;

  const deltaPercent = ((currentTotal - prevTotal) / prevTotal) * 100;
  if (Math.abs(deltaPercent) < TOTAL_DELTA_THRESHOLD_PERCENT) return null;

  return {
    type: "vs_prev_month_total",
    data: {
      deltaPercent,
      prevAmount: prevTotal.toFixed(0),
      currentAmount: currentTotal.toFixed(0),
      currency: defaultCurrency,
    },
    priority: 4,
  };
}

export function detectVsPrevMonthCategory(
  currentByCategory: Array<{ category: string; amount: string }>,
  prevByCategory: Array<{ category: string; amount: string }>,
  defaultCurrency: string
): Insight | null {
  const prevMap = new Map(prevByCategory.map((c) => [c.category, Number(c.amount)]));

  let maxDelta = 0;
  let maxCategory: string | null = null;
  let maxDeltaAmount = 0;

  for (const { category, amount } of currentByCategory) {
    const currentAmt = Number(amount);
    const prevAmt = prevMap.get(category) ?? 0;
    if (prevAmt <= 0) continue;

    const deltaAmount = currentAmt - prevAmt;
    const deltaPercent = (deltaAmount / prevAmt) * 100;

    if (
      deltaAmount > maxDeltaAmount &&
      (deltaPercent >= CATEGORY_DELTA_THRESHOLD_PERCENT ||
        deltaAmount >= CATEGORY_DELTA_MIN_AMOUNT)
    ) {
      maxDeltaAmount = deltaAmount;
      maxCategory = category;
      maxDelta = deltaAmount;
    }
  }

  if (!maxCategory || maxDelta <= 0) return null;

  return {
    type: "vs_prev_month_category",
    data: {
      category: maxCategory,
      deltaAmount: maxDelta.toFixed(0),
      currency: defaultCurrency,
    },
    priority: 5,
  };
}
