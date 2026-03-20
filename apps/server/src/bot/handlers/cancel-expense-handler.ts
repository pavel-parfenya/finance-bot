import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { formatExpense } from "../format";
import { cancelPending, saveNow } from "../pending-expense-store";
import { triggerAnalyticsAfterTransaction } from "../analytics-trigger";

export const CANCEL_CALLBACK = "cancel_expense";
export const SAVE_NOW_CALLBACK = "save_expense";

export function createCancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("Отмена", CANCEL_CALLBACK);
}

export function createSaveNowKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Сохранить сейчас", SAVE_NOW_CALLBACK)
    .text("Отмена", CANCEL_CALLBACK);
}

export function createCancelExpenseHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const cq = ctx.callbackQuery;
    if (!cq) return;
    const data = cq.data;
    if (data !== CANCEL_CALLBACK && data !== SAVE_NOW_CALLBACK) return;

    const msg = cq.message;
    if (!msg || !("message_id" in msg) || !("text" in msg)) return;

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const messageId = msg.message_id;

    if (data === SAVE_NOW_CALLBACK) {
      const onSaved = deps.bot
        ? (uid: number, wid: number) =>
            triggerAnalyticsAfterTransaction(uid, wid, {
              analyticsInsightService: deps.analyticsInsightService,
              userService: deps.userService,
              workspaceService: deps.workspaceService,
              bot: deps.bot!,
              monthlyReportGenerator: deps.monthlyReportGenerator,
            })
        : undefined;
      const result = await saveNow(chatId, messageId, onSaved);
      await ctx.answerCallbackQuery({
        text: result.saved ? "Сохранено!" : "Уже сохранено или отменено.",
      });
      if (result.saved && result.expense) {
        await ctx.api.editMessageText(
          chatId,
          messageId,
          formatExpense(result.expense, false),
          { reply_markup: { inline_keyboard: [] } }
        );
      }
      return;
    }

    const cancelled = cancelPending(chatId, messageId);
    await ctx.answerCallbackQuery();

    if (cancelled) {
      await ctx.api.deleteMessage(chatId, messageId);
      await ctx.reply("Запись транзакции отменена пользователем.");
    }
  };
}
