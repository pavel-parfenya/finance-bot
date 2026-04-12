import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { CURRENCIES } from "@finance-bot/shared";
import { resolveUser } from "../utils";
import {
  createAnalyticsOnboardingKeyboard,
  getAnalyticsOnboardingMessageText,
} from "./analytics-onboard-handler";

export const SET_CURRENCY_PREFIX = "set_currency:";

export function createCurrencyKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  CURRENCIES.forEach((c, i) => {
    kb.text(c, `${SET_CURRENCY_PREFIX}${c}`);
    if (i % 3 === 2) kb.row();
  });
  return kb;
}

export function createCurrencyHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const data = ctx.callbackQuery?.data;
    if (!data?.startsWith(SET_CURRENCY_PREFIX)) return;

    const currency = data.slice(SET_CURRENCY_PREFIX.length);
    if (!(CURRENCIES as readonly string[]).includes(currency)) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) {
      await ctx.answerCallbackQuery({ text: "Ошибка: пользователь не найден." });
      return;
    }

    const isFirstCurrencyChoice = !user.defaultCurrency?.trim();

    await deps.userService.setDefaultCurrency(user.id, currency);
    await ctx.answerCallbackQuery({ text: `Валюта по умолчанию: ${currency}` });

    const chatId = ctx.chat?.id;
    const msg = ctx.callbackQuery?.message;
    const messageId = msg && "message_id" in msg ? msg.message_id : undefined;
    if (chatId != null && messageId != null) {
      try {
        await ctx.api.editMessageReplyMarkup(chatId, messageId, {
          reply_markup: { inline_keyboard: [] },
        });
      } catch {
        // Сообщение могло быть уже отредактировано
      }
    }

    if (isFirstCurrencyChoice) {
      try {
        await ctx.reply(getAnalyticsOnboardingMessageText(), {
          reply_markup: createAnalyticsOnboardingKeyboard(),
        });
      } catch (err) {
        console.error("analytics onboarding reply:", err);
      }
    }
  };
}
