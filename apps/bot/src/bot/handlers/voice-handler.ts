import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser, getUserDisplayName } from "../utils";
import { parseMessage } from "../message-router";
import { handleParsedMessage } from "./message-handler";

const INVALID_REPLY =
  "Не удалось внести данные: информация невалидная (указана нулевая сумма или не распознано описание).";

export function createVoiceHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const voice = ctx.message?.voice;
    if (!voice) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

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

      let customCategories: Array<{ name: string; description: string }> | undefined;
      try {
        const workspace = await deps.workspaceService.getWorkspaceForUser(user.id);
        if (workspace) {
          customCategories = await deps.customCategoryService.getCategoriesPlain(
            workspace.id
          );
        }
      } catch {
        customCategories = undefined;
      }

      const text = await deps.expenseService.recognizeVoice(buffer, mimeType);

      const parsed = await parseMessage(
        text,
        displayName,
        defaultCurrency,
        {
          debtParser: deps.debtParser,
          expenseService: deps.expenseService,
          purchaseAdviceParser: deps.purchaseAdviceParser,
        },
        customCategories
      );

      if (!parsed) {
        await ctx.reply(INVALID_REPLY);
        return;
      }

      if (parsed.type === "expense" || parsed.type === "income") {
        await ctx.reply(
          parsed.type === "income"
            ? "Обрабатываю ваш доход..."
            : "Обрабатываю ваш расход..."
        );
      }

      await handleParsedMessage(ctx, parsed, deps, {
        userId: user.id,
        displayName,
        originalText: text,
      });
    } catch (error) {
      console.error("Ошибка обработки голосового сообщения:", error);
      await ctx.reply(
        "Не удалось обработать голосовое сообщение. Попробуйте ещё раз или отправьте текстом."
      );
    }
  };
}
