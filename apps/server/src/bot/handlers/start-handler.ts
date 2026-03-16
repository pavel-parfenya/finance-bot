import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";

export function createStartHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const user = await resolveUser(ctx, deps.userService);
    if (!user) {
      await ctx.reply("Не удалось определить пользователя. Попробуйте ещё раз.");
      return;
    }

    const workspace = await deps.workspaceService.getWorkspaceForUser(user.id);
    const hasWorkspace = !!workspace;

    const keyboard = deps.miniAppUrl
      ? new InlineKeyboard().webApp("Мои расходы", deps.miniAppUrl)
      : undefined;

    const text = hasWorkspace
      ? `С возвращением! Открывайте приложение для просмотра трат и аналитики.\n\n` +
        "Отправляйте текстовые или голосовые сообщения о тратах — всё сохраняется.\n\n" +
        "Пример: «Купил 3 пачки яиц за 5 BYN в Евроопте»\n\n" +
        "Подробнее: /help"
      : "Привет! Я бот для учёта расходов.\n\n" +
        "Отправляйте текстовые или голосовые сообщения о тратах — бот сохранит их. " +
        "Открывайте приложение для просмотра истории и аналитики.\n\n" +
        "Пример: «Купил 3 пачки яиц за 5 BYN в Евроопте»\n\n" +
        "Подробнее: /help";

    await ctx.reply(text, keyboard ? { reply_markup: keyboard } : {});
  };
}
