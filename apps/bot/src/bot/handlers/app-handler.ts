import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";

export function createAppHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (!deps.miniAppUrl) {
      await ctx.reply("Приложение временно недоступно.");
      return;
    }

    const keyboard = new InlineKeyboard().webApp("Открыть приложение", deps.miniAppUrl);
    await ctx.reply("Нажмите кнопку ниже, чтобы открыть приложение:", {
      reply_markup: keyboard,
    });
  };
}
