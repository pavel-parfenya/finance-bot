import type { TransactionFilters } from "@finance-bot/shared";

/** Собрать те же фильтры, что на аналитике, для перехода на /table. */
export function analyticsStateToTableFilters(
  period: string,
  startDate: string,
  endDate: string,
  userIdFilter: string,
  category?: string
): TransactionFilters {
  const f: TransactionFilters = { period };
  if (period === "period") {
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
  }
  if (category) f.category = category;
  if (userIdFilter) {
    const n = parseInt(userIdFilter, 10);
    if (!isNaN(n)) f.userId = n;
  }
  return f;
}

export function tableFiltersToQuery(f: TransactionFilters): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.period) q.period = f.period;
  if (f.startDate) q.startDate = f.startDate;
  if (f.endDate) q.endDate = f.endDate;
  if (f.category) q.category = f.category;
  if (f.userId != null) q.userId = String(f.userId);
  return q;
}
