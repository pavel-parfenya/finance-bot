import { Expense } from "../domain/models";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatExpense(expense: Expense, includeConfirmHint = true): string {
  const dateStr = formatDate(expense.date);

  const lines = [
    "Расход добавлен:",
    "",
    `Дата:      ${dateStr}`,
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
