import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { cancelPending } from "../pending-expense-store";

export const CANCEL_CALLBACK = "cancel_expense";

export function createCancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("Отмена", CANCEL_CALLBACK);
}

export function createCancelExpenseHandler(_deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (ctx.callbackQuery?.data !== CANCEL_CALLBACK) return;

    const msg = ctx.callbackQuery.message;
    if (!msg || !("message_id" in msg)) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const messageId = msg.message_id;

    const cancelled = cancelPending(chatId, messageId);
    await ctx.answerCallbackQuery();

    if (cancelled) {
      await ctx.api.deleteMessage(chatId, messageId);
      await ctx.reply("Запись транзакции отменена пользователем.");
    }
  };
}
