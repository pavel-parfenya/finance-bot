/**
 * Format ISO date string to DD.MM.YY (matches @finance-bot/shared formatDate)
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = String(dateStr).split("T")[0].split("-");
  if (parts.length !== 3) return String(dateStr);
  return `${parts[2]}.${parts[1]}.${parts[0].slice(-2)}`;
}

/**
 * Get default period dates for "period" filter (current month).
 * Matches @finance-bot/shared getDefaultPeriodDates.
 */
export function getDefaultPeriodDates(): { start: string; end: string } {
  const d = new Date();
  const m = d.getMonth();
  const y = d.getFullYear();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`;
  return { start, end };
}

/** Currencies - matches @finance-bot/shared CURRENCIES */
export const CURRENCIES = ["BYN", "USD", "EUR", "RUB", "UAH", "KZT", "PLN"] as const;
