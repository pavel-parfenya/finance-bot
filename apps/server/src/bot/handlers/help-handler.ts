import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";

export function createHelpHandler(_deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const user = await resolveUser(ctx, _deps.userService);
    if (!user) return;

    const text =
      "📖 ИНСТРУКЦИЯ\n\n" +
      "▫️ Как начать\n" +
      "Отправляйте текстовые или голосовые сообщения о тратах — бот сохранит их.\n\n" +
      "▫️ Примеры\n" +
      "• Купил 3 пачки яиц за 5 BYN в Евроопте\n" +
      "• Обед 15 руб в столовой\n" +
      "• Одолжил Саше 100р до конца месяца\n" +
      "• Одолжил у Саши 100\n\n" +
      "▫️ Команды\n" +
      "/start — главное меню и выбор валюты\n" +
      "/help — эта инструкция\n" +
      "/app — открыть приложение\n\n" +
      "В приложении: история трат, аналитика, долги, настройки и приглашение участников.";

    await ctx.reply(text);
  };
}
