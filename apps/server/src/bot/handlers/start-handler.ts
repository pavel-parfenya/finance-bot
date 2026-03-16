import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";
import { createCurrencyKeyboard } from "./currency-handler";

export function createStartHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const user = await resolveUser(ctx, deps.userService);
    if (!user) {
      await ctx.reply("Не удалось определить пользователя. Попробуйте ещё раз.");
      return;
    }

    const workspace = await deps.workspaceService.getWorkspaceForUser(user.id);
    const hasWorkspace = !!workspace;
    const defaultCurrency = await deps.userService.getDefaultCurrency(user.id);

    const text = hasWorkspace
      ? `С возвращением! Отправляйте текстовые или голосовые сообщения о тратах — всё сохраняется.\n\n` +
        "Пример: «Купил 3 пачки яиц за 5 BYN в Евроопте»\n\n" +
        (defaultCurrency
          ? `Валюта по умолчанию: ${defaultCurrency}. Нажмите кнопку ниже, чтобы изменить.\n\n`
          : "Выберите валюту по умолчанию:\n\n") +
        "Подробнее: /help"
      : "Привет! Я бот для учёта расходов.\n\n" +
        "Отправляйте текстовые или голосовые сообщения о тратах — бот сохранит их.\n\n" +
        "Выберите валюту по умолчанию (можно изменить в настройках приложения):\n\n" +
        "Пример: «Купил 3 пачки яиц за 5 BYN в Евроопте»\n\n" +
        "Подробнее: /help";

    await ctx.reply(text, {
      reply_markup: createCurrencyKeyboard(),
    });
  };
}
