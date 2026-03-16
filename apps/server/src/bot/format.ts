import { Expense } from "../domain/models";

function formatDateTime(date: Date): { dateStr: string; timeStr: string } {
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateStr, timeStr };
}

export function formatExpense(expense: Expense): string {
  const { dateStr, timeStr } = formatDateTime(expense.date);

  return [
    "Расход добавлен:",
    "",
    `Дата:      ${dateStr}`,
    `Время:     ${timeStr}`,
    `Личность:  ${expense.username}`,
    `Описание:  ${expense.description}`,
    `Категория: ${expense.category}`,
    `Сумма:     ${expense.amount} ${expense.currency}`,
    `Магазин:   ${expense.store}`,
    "",
    "Запишется через 30 сек.",
    "Нажмите «Отмена», чтобы отменить.",
  ].join("\n");
}
