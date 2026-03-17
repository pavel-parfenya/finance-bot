import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { formatExpense } from "../format";
import { createSaveNowKeyboard } from "./cancel-expense-handler";
import { scheduleSave } from "../pending-expense-store";
import type { ParsedMessage } from "../message-router";

export async function handleParsedMessage(
  ctx: Context,
  parsed: ParsedMessage,
  deps: BotDeps,
  options: { userId: number; displayName: string; originalText: string }
): Promise<void> {
  const { userId, displayName, originalText } = options;

  switch (parsed.type) {
    case "debt": {
      const { debt, linkedUserTelegramId, notificationMessage } =
        await deps.debtService.createFromParsed(
          userId,
          displayName,
          parsed.data,
          originalText
        );
      await ctx.reply(notificationMessage);

      if (linkedUserTelegramId && debt.status === "pending") {
        const kb = new InlineKeyboard()
          .text("Подтвердить", `debt_confirm:${debt.id}`)
          .text("Отклонить", `debt_reject:${debt.id}`);
        await ctx.api.sendMessage(
          linkedUserTelegramId,
          `${displayName} создал(а) запись о долге: ${parsed.data.otherPersonName} — ${parsed.data.amount} ${parsed.data.currency}. Подтвердите или отклоните.`,
          { reply_markup: kb }
        );
      }
      break;
    }

    case "expense": {
      const workspace = await deps.workspaceService.getOrCreateWorkspaceForUser(userId);
      const msg = await ctx.reply(formatExpense(parsed.data), {
        reply_markup: createSaveNowKeyboard(),
      });

      scheduleSave(
        msg.chat.id,
        msg.message_id,
        userId,
        workspace.id,
        parsed.data,
        deps.transactionRepo,
        async (chatId, messageId, expense) => {
          try {
            await ctx.api.editMessageText(
              chatId,
              messageId,
              formatExpense(expense, false),
              { reply_markup: { inline_keyboard: [] } }
            );
          } catch {
            /* ignore */
          }
        }
      );
      break;
    }
  }
}
