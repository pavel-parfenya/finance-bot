import { Context } from "grammy";
import { ExpenseService } from "../../services/expense-service";
import { formatExpense } from "../format";
import { getUserDisplayName } from "../utils";

export function createVoiceHandler(expenseService: ExpenseService) {
  return async (ctx: Context): Promise<void> => {
    const voice = ctx.message?.voice;
    if (!voice) return;

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

      const username = getUserDisplayName(ctx);
      const expense = await expenseService.processVoice(buffer, mimeType, username);
      await ctx.reply(formatExpense(expense));
    } catch (error) {
      console.error("Ошибка обработки голосового сообщения:", error);
      await ctx.reply(
        "Не удалось обработать голосовое сообщение. Попробуйте ещё раз или отправьте текстом."
      );
    }
  };
}
