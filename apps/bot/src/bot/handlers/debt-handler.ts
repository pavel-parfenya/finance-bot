import { Context } from "grammy";
import { BotDeps } from "../bot";
import { getUserDisplayName } from "../utils";
import { ExpenseCategory } from "@finance-bot/server-core";

export function createDebtCallbackHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const data = ctx.callbackQuery?.data;
    if (
      !data?.startsWith("debt_confirm:") &&
      !data?.startsWith("debt_reject:") &&
      !data?.startsWith("debt_repaid_add:") &&
      !data?.startsWith("debt_repaid_skip:")
    )
      return;

    const user = await deps.userService.findOneByTelegramId(ctx.from?.id ?? 0);
    if (!user) {
      await ctx.answerCallbackQuery({ text: "Пользователь не найден." });
      return;
    }

    if (data.startsWith("debt_repaid_add:") || data.startsWith("debt_repaid_skip:")) {
      const parts = data.split(":");
      const debtId = parseInt(parts[1], 10);
      const amount = data.startsWith("debt_repaid_add:")
        ? parseFloat(parts[2] ?? "0")
        : 0;
      if (isNaN(debtId)) return;

      const debt = await deps.debtService.findById(debtId);
      if (!debt || debt.debtorUserId !== user.id) {
        await ctx.answerCallbackQuery({ text: "Долг не найден или вы не должник." });
        return;
      }

      if (data.startsWith("debt_repaid_add:") && amount > 0) {
        const workspace = await deps.workspaceService.getOrCreateWorkspaceForUser(
          user.id
        );
        const displayName = getUserDisplayName(ctx);
        const expense = {
          description: `Возврат долга ${debt.creditorName}`,
          category: ExpenseCategory.Other,
          amount,
          currency: debt.currency,
          store: "Неизвестно",
          type: "expense" as const,
          date: new Date(),
          username: displayName,
        };
        await deps.transactionRepo.save(workspace.id, user.id, expense);
        await ctx.answerCallbackQuery({
          text: `Расход на ${amount} ${debt.currency} добавлен.`,
        });
      } else {
        await ctx.answerCallbackQuery({ text: "Ок." });
      }

      const chatId = ctx.chat?.id;
      const msg = ctx.callbackQuery?.message;
      const messageId = msg && "message_id" in msg ? msg.message_id : undefined;
      if (chatId != null && messageId != null) {
        try {
          await ctx.api.editMessageReplyMarkup(chatId, messageId, {
            reply_markup: { inline_keyboard: [] },
          });
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const debtId = parseInt(data.split(":")[1], 10);
    if (isNaN(debtId)) return;

    if (data.startsWith("debt_confirm:")) {
      const ok = await deps.debtService.confirmDebt(debtId, user.id);
      await ctx.answerCallbackQuery({
        text: ok ? "Долг подтверждён." : "Не удалось подтвердить.",
      });
      if (ok) {
        const chatId = ctx.chat?.id;
        const msg = ctx.callbackQuery?.message;
        const messageId = msg && "message_id" in msg ? msg.message_id : undefined;
        if (chatId != null && messageId != null) {
          try {
            await ctx.api.editMessageReplyMarkup(chatId, messageId, {
              reply_markup: { inline_keyboard: [] },
            });
          } catch {
            /* ignore */
          }
        }
      }
    } else {
      const ok = await deps.debtService.rejectDebt(debtId, user.id);
      await ctx.answerCallbackQuery({
        text: ok ? "Долг отклонён." : "Не удалось отклонить.",
      });
      if (ok) {
        const chatId = ctx.chat?.id;
        const msg = ctx.callbackQuery?.message;
        const messageId = msg && "message_id" in msg ? msg.message_id : undefined;
        if (chatId != null && messageId != null) {
          try {
            await ctx.api.deleteMessage(chatId, messageId);
          } catch {
            /* ignore */
          }
        }
      }
    }
  };
}
