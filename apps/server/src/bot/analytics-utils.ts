/** Последние 5 дней месяца — отправляем развёрнутый отчёт вместо короткого инсайта */
const END_OF_MONTH_DAY = 26;

export function isEndOfMonth(): boolean {
  const day = new Date().getDate();
  return day >= END_OF_MONTH_DAY;
}
