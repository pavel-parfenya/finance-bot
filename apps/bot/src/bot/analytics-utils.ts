/** Последний календарный день месяца (локальная дата сервера). */
export function isLastDayOfMonth(now: Date = new Date()): boolean {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getDate() === 1;
}
