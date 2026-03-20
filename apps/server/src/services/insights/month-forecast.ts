import type { Insight } from "../../analytics/types";

export function detectMonthForecast(
  totalCurrent: number,
  defaultCurrency: string
): Insight | null {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();

  if (daysPassed <= 0 || totalCurrent <= 0) return null;

  const dailyAvg = totalCurrent / daysPassed;
  const forecast = dailyAvg * daysInMonth;

  return {
    type: "month_forecast",
    data: {
      amount: forecast.toFixed(0),
      currency: defaultCurrency,
    },
    priority: 2,
  };
}
