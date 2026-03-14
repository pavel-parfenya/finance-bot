import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser, extractSheetId } from "../utils";
import { formatBotEmailForCopy } from "../helpers/format-email";

export function createLinkHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    const text = ctx.message?.text ?? "";
    const args = text.replace(/^\/link\s*/, "").trim();

    if (!args) {
      const emailBlock = formatBotEmailForCopy(deps.botEmail);
      await ctx.reply(
        "Чтобы подключить таблицу:\n\n" +
          "1. Откройте таблицу → «Настройки доступа»\n" +
          "2. Добавьте email бота как редактора (см. ниже)\n" +
          "3. Отправьте ссылку: /link https://docs.google.com/spreadsheets/d/...\n\n" +
          emailBlock
      );
      return;
    }

    const sheetId = extractSheetId(args);
    if (!sheetId) {
      await ctx.reply(
        "Не удалось распознать ссылку. Отправьте полную ссылку на Google Sheets таблицу."
      );
      return;
    }

    try {
      const existing = await deps.workspaceService.getWorkspaceForUser(user.id);
      const hasSheet = existing && deps.workspaceService.hasSheet(existing);

      if (hasSheet) {
        await ctx.reply("У вас уже есть подключённая таблица.");
        return;
      }

      let workspace;
      if (existing && !deps.workspaceService.hasSheet(existing)) {
        workspace = await deps.workspaceService.linkSheetToPendingWorkspace(
          user.id,
          sheetId,
          "Мои расходы",
          deps.transactionRepo
        );
      } else {
        workspace = await deps.workspaceService.createWorkspace(
          user.id,
          sheetId,
          "Мои расходы"
        );
      }

      const migrated = existing && !deps.workspaceService.hasSheet(existing);
      const migratedMsg = migrated
        ? "\n\nВсе ранее сохранённые траты перенесены в таблицу."
        : "";

      await ctx.reply(
        `Таблица «${workspace.title}» подключена!${migratedMsg}\n\n` +
          "Лист «Транзакции» готов. Отправляйте сообщения о тратах.\n" +
          "Пример: «Купил 3 пачки яиц за 5 BYN в Евроопте»\n\n" +
          "Пригласить участника: /invite @username"
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Неизвестная ошибка";
      console.error("Ошибка подключения таблицы:", error);
      await ctx.reply(`Не удалось подключить таблицу: ${msg}`);
    }
  };
}
