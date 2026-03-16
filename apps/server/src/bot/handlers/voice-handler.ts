import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser, getUserDisplayName } from "../utils";
import { formatExpense } from "../format";
import { createSaveNowKeyboard } from "./cancel-expense-handler";
import { scheduleSave } from "../pending-expense-store";
import { InvalidExpenseError } from "../../domain/errors";

const INVALID_REPLY =
  "Не удалось внести данные: информация невалидная (указана нулевая сумма или не распознано описание).";

export function createVoiceHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const voice = ctx.message?.voice;
    if (!voice) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    const workspace = await deps.workspaceService.getOrCreateWorkspaceForUser(user.id);

    await ctx.reply("Распознаю голосовое сообщение...");

    try {
      const file = await ctx.api.getFile(voice.file_id);
      const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Не удалось скачать голосовой файл: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = voice.mime_type ?? "audio/ogg";

      const displayName = getUserDisplayName(ctx);
      const defaultCurrency = await deps.userService.getDefaultCurrency(user.id);
      const expense = await deps.expenseService.parseVoice(
        buffer,
        mimeType,
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
      console.error("Ошибка обработки голосового сообщения:", error);
      await ctx.reply(
        "Не удалось обработать голосовое сообщение. Попробуйте ещё раз или отправьте текстом."
      );
    }
  };
}
