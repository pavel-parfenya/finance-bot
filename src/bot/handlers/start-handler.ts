import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";
import { formatBotEmailForCopy } from "../helpers/format-email";

export function createStartHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const user = await resolveUser(ctx, deps.userService);
    if (!user) {
      await ctx.reply("Не удалось определить пользователя. Попробуйте ещё раз.");
      return;
    }

    const workspace = await deps.workspaceService.getWorkspaceForUser(user.id);
    const hasSheet = workspace && deps.workspaceService.hasSheet(workspace);

    if (workspace && hasSheet) {
      await ctx.reply(
        `С возвращением! Ваша таблица «${workspace.title}» подключена.\n\n` +
          "Отправляйте текстовые или голосовые сообщения о тратах — всё сохраняется в таблицу.\n\n" +
          "Пример: «Купил 3 пачки яиц за 5 BYN в Евроопте»\n\n" +
          "Подробная инструкция: /help"
      );
      return;
    }

    const keyboard = new InlineKeyboard().url("Создать таблицу", deps.createSheetUrl);

    const emailBlock = formatBotEmailForCopy(deps.botEmail);

    const intro =
      workspace && !hasSheet
        ? "Вы уже добавляете траты — бот их запоминает. Подключите таблицу через /link, и все записи автоматически перенесутся туда. Аналитика и сводки доступны только в Google Sheets.\n\n"
        : "Привет! Я бот для учёта расходов.\n\n" +
          "Вы можете пользоваться ботом без привязки таблицы — бот запоминает все траты. Подключив таблицу через /link, вы получите доступ к данным в Google Sheets: там доступна аналитика, сводки и удобная работа с историей.\n\n" +
          "Создайте таблицу по кнопке ниже, дайте доступ боту и отправьте /link со ссылкой.\n\n";

    const text = intro + emailBlock + "\n\nПодробная инструкция: /help";
    await ctx.reply(text, { reply_markup: keyboard });
  };
}
