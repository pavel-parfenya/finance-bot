import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";

export const ANALYTICS_ONBOARD_PREFIX = "analytics_onboard:";

export function createAnalyticsOnboardingKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Включить", `${ANALYTICS_ONBOARD_PREFIX}on`)
    .text("Пока нет", `${ANALYTICS_ONBOARD_PREFIX}off`);
}

/** Первое сообщение с кнопками включить/выключить рассылки аналитики. */
export function getAnalyticsOnboardingMessageText(): string {
  return (
    "У бота есть полезные сообщения с аналитикой: вечером может напомнить внести траты, в конце месяца — разбор расходов, по воскресеньям — прогноз на месяц.\n\n" +
    "Включить их сейчас или оставить выключенными? Потом всё можно поменять в приложении: Настройки → Аналитика."
  );
}

export function createAnalyticsOnboardHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const data = ctx.callbackQuery?.data;
    if (!data?.startsWith(ANALYTICS_ONBOARD_PREFIX)) return;

    const action = data.slice(ANALYTICS_ONBOARD_PREFIX.length);
    if (action !== "on" && action !== "off") return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) {
      await ctx.answerCallbackQuery({ text: "Пользователь не найден." });
      return;
    }

    const enable = action === "on";
    await deps.userService.updateUserSettings(user.id, {
      analyticsReminderEod: enable,
      analyticsMonthReport: enable,
      analyticsForecastWeekly: enable,
    });

    await ctx.answerCallbackQuery({
      text: enable ? "Включено." : "Ок, без рассылок.",
    });

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

    await ctx.reply(
      enable
        ? "Готово: напоминания и отчёты включены. Настроить по отдельности или выключить можно в приложении: Настройки → Аналитика."
        : "Ок, без этих сообщений. Включить позже можно в приложении: Настройки → Аналитика."
    );
  };
}
