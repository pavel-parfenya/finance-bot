import type { Expense } from "@finance-bot/server-core";

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatExpense(expense: Expense, includeConfirmHint = true): string {
  const dateStr = formatDate(expense.date);
  const isIncome = expense.type === "income";
  const header = isIncome ? "Доход добавлен:" : "Расход добавлен:";
  const storeLabel = isIncome ? "Источник:" : "Магазин:";

  const lines = [
    header,
    "",
    `Дата:      ${dateStr}`,
    `Личность:  ${expense.username}`,
    `Описание:  ${expense.description}`,
    `Категория: ${expense.category}`,
    `Сумма:     ${expense.amount} ${expense.currency}`,
    `${storeLabel.padEnd(10)} ${expense.store}`,
  ];
  if (includeConfirmHint) {
    lines.push("", "Запишется через 30 сек.", "Нажмите «Отмена», чтобы отменить.");
  }
  return lines.join("\n");
}
