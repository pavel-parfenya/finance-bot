import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser, getUserDisplayName } from "../utils";
import { formatExpense } from "../format";
import { createSaveNowKeyboard } from "./cancel-expense-handler";
import { scheduleSave } from "../pending-expense-store";
import { InvalidExpenseError } from "../../domain/errors";

const INVALID_REPLY =
  "Не удалось внести данные: информация невалидная (указана нулевая сумма или не распознано описание).";

export function createTextHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (ctx.message?.voice) return;
    const text = ctx.message?.text;
    if (!text || text.startsWith("/")) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    const workspace = await deps.workspaceService.getOrCreateWorkspaceForUser(user.id);

    await ctx.reply("Обрабатываю ваш расход...");

    try {
      const displayName = getUserDisplayName(ctx);
      const defaultCurrency = await deps.userService.getDefaultCurrency(user.id);
      const expense = await deps.expenseService.parseText(
        text,
        displayName,
        defaultCurrency
      );

      const msg = await ctx.reply(formatExpense(expense), {
        reply_markup: createSaveNowKeyboard(),
      });

      scheduleSave(
        msg.chat.id,
        msg.message_id,
        user.id,
        workspace.id,
        expense,
        deps.transactionRepo
      );
    } catch (error) {
      if (error instanceof InvalidExpenseError) {
        await ctx.reply(INVALID_REPLY);
        return;
      }
      console.error("Ошибка обработки текстового сообщения:", error);
      await ctx.reply(
        "Не удалось обработать сообщение. Попробуйте ещё раз, например:\n" +
          "«Купил 3 пачки яиц за 5 BYN в Евроопте»"
      );
    }
  };
}
