/** Форматирует сумму с валютой: «1 234,5 BYN». */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string
): string {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`;
}
