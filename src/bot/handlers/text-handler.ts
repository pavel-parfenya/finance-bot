import { Context } from "grammy";
import { ExpenseService } from "../../services/expense-service";
import { formatExpense } from "../format";
import { getUserDisplayName } from "../utils";

export function createTextHandler(expenseService: ExpenseService) {
  return async (ctx: Context): Promise<void> => {
    const text = ctx.message?.text;
    if (!text) return;

    await ctx.reply("Обрабатываю ваш расход...");

    try {
      const username = getUserDisplayName(ctx);
      const expense = await expenseService.processText(text, username);
      await ctx.reply(formatExpense(expense));
    } catch (error) {
      console.error("Ошибка обработки текстового сообщения:", error);
      await ctx.reply(
        "Не удалось обработать сообщение. Попробуйте ещё раз, например:\n" +
          '«Купил 3 пачки яиц за 150₽ в Пятёрочке»'
      );
    }
  };
}
