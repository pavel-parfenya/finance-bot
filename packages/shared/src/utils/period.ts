export interface PeriodRange {
  start: Date;
  end: Date;
  periodLabel: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build start/end dates and label for a period type.
 * Used by both client (filter UI) and server (analytics, transactions).
 */
export function buildPeriodRange(
  periodType: string,
  startDateParam?: string,
  endDateParam?: string
): PeriodRange {
  const now = new Date();

  if (
    periodType === "period" &&
    startDateParam &&
    endDateParam &&
    DATE_REGEX.test(startDateParam) &&
    DATE_REGEX.test(endDateParam)
  ) {
    const start = new Date(startDateParam);
    const end = new Date(endDateParam);
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      periodLabel: `${startDateParam} — ${endDateParam}`,
    };
  }

  if (periodType === "prev") {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 12 : now.getMonth();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    return {
      start,
      end,
      periodLabel: `${y}-${String(m).padStart(2, "0")} (пред. месяц)`,
    };
  }

  // current or default
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date();
  return {
    start,
    end,
    periodLabel: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")} (текущий)`,
  };
}

/**
 * Get default period dates for "period" filter (current month).
 */
export function getDefaultPeriodDates(): { start: string; end: string } {
  const d = new Date();
  const m = d.getMonth();
  const y = d.getFullYear();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`;
  return { start, end };
}
