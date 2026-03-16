import { Expense } from "../domain/models";

function formatDateTime(date: Date): { dateStr: string; timeStr: string } {
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateStr, timeStr };
}

export function formatExpense(expense: Expense, includeConfirmHint = true): string {
  const { dateStr, timeStr } = formatDateTime(expense.date);

  const lines = [
    "Расход добавлен:",
    "",
    `Дата:      ${dateStr}`,
    `Время:     ${timeStr}`,
    `Личность:  ${expense.username}`,
    `Описание:  ${expense.description}`,
    `Категория: ${expense.category}`,
    `Сумма:     ${expense.amount} ${expense.currency}`,
    `Магазин:   ${expense.store}`,
  ];
  if (includeConfirmHint) {
    lines.push("", "Запишется через 30 сек.", "Нажмите «Отмена», чтобы отменить.");
  }
  return lines.join("\n");
}
