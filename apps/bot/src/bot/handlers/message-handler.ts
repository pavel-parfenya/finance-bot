import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { formatExpense } from "../format";
import { createSaveNowKeyboard } from "./cancel-expense-handler";
import { replyFeatureGated } from "./upgrade-prompt";
import {
  checkMonthlyTransactionLimit,
  replyMonthlyLimitReached,
} from "./monthly-transaction-limit";
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
      if (!(await deps.featureService.hasFeature(userId, "debts"))) {
        await replyFeatureGated(
          ctx,
          deps,
          ctx.from?.id,
          "💸 Учёт долгов доступен на платном тарифе."
        );
        return;
      }

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

    case "purchase_advice": {
      if (!deps.purchaseAdviceService) {
        await ctx.reply("Сервис советов временно недоступен.");
        return;
      }
      await ctx.reply("Анализирую твои траты...");
      try {
        const workspaceIds = await deps.workspaceService.getWorkspaceIdsForUser(userId);
        const voice = await deps.userService.getAnalyticsVoice(userId);
        const advice = await deps.purchaseAdviceService.getAdvice(
          userId,
          workspaceIds,
          parsed.data,
          voice
        );
        await ctx.reply(advice);
      } catch (err) {
        console.error("Purchase advice error:", err);
        await ctx.reply("Не удалось проанализировать. Попробуй позже.");
      }
      return;
    }

    case "expense":
    case "income": {
      // Квота транзакций в месяц по тарифу: за лимитом — не сохраняем, а
      // предлагаем подписку и сообщаем дату сброса.
      const limitReached = await checkMonthlyTransactionLimit(deps, userId);
      if (limitReached) {
        await replyMonthlyLimitReached(ctx, deps, limitReached);
        return;
      }

      if (ctx.message?.date) {
        parsed.data.date = new Date(ctx.message.date * 1000);
      }
      const workspace = await deps.workspaceService.getOrCreateWorkspaceForUser(userId);

      // Привязка к событию: если LLM распознал активное событие пользователя.
      let eventId: number | null = null;
      let eventName: string | null = null;
      if (parsed.data.eventName) {
        try {
          const ev = await deps.eventService.findActiveEventByName(
            userId,
            parsed.data.eventName
          );
          if (ev) {
            eventId = ev.id;
            eventName = ev.name;
          }
        } catch {
          eventId = null;
        }
      }

      const eventNote = eventName ? `\n\n📅 Событие: ${eventName}` : "";
      const msg = await ctx.reply(formatExpense(parsed.data) + eventNote, {
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
              formatExpense(expense, false) + eventNote,
              { reply_markup: { inline_keyboard: [] } }
            );
          } catch {
            /* ignore */
          }
        },
        eventId
      );
      break;
    }
  }
}
