export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = String(dateStr).split("T")[0].split("-");
  if (parts.length !== 3) return String(dateStr);
  return `${parts[2]}.${parts[1]}.${parts[0].slice(-2)}`;
}

export function getDefaultPeriodDates(): { start: string; end: string } {
  const d = new Date();
  const m = d.getMonth();
  const y = d.getFullYear();
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`;
  return { start, end };
}

export const CURRENCIES = ["BYN", "USD", "EUR", "RUB", "UAH", "KZT", "PLN"] as const;
