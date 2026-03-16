/**
 * Format ISO date string to DD.MM.YY
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = String(dateStr).split("T")[0].split("-");
  if (parts.length !== 3) return String(dateStr);
  return `${parts[2]}.${parts[1]}.${parts[0].slice(-2)}`;
}
