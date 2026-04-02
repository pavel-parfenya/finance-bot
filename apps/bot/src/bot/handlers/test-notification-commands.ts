import { Context } from "grammy";
import { format, toZonedTime } from "date-fns-tz";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";
import { sendMonthlyReportForUserId } from "../analytics-monthly-report-send";
import { sendEndOfDayReminderForUserId } from "../analytics-eod-send";
import { sendWeeklyForecastForUserId } from "../analytics-forecast-send";
import { sendInactiveUserMonthNudgeIfDue } from "../inactive-user-nudge-send";

function assertNonProd(ctx: Context): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  void ctx.reply("Команда только для разработки.");
  return false;
}

/** /test_analytics — месячный отчёт (LLM). */
export function createTestAnalyticsHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (!assertNonProd(ctx)) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    await ctx.reply("Отправляю месячный отчёт…");

    try {
      if (!deps.monthlyReportGenerator) {
        await ctx.reply("Генератор отчёта не настроен.");
        return;
      }
      await sendMonthlyReportForUserId(
        user.id,
        {
          analyticsInsightService: deps.analyticsInsightService,
          userService: deps.userService,
          workspaceService: deps.workspaceService,
          bot: deps.bot!,
          monthlyReportGenerator: deps.monthlyReportGenerator,
        },
        { forDevTest: true }
      );
      await ctx.reply("Готово.");
    } catch (err) {
      console.error("test_analytics:", err);
      await ctx.reply("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    }
  };
}

/** /test_reminder_eod — напоминание в конце дня (LLM). */
export function createTestReminderEodHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (!assertNonProd(ctx)) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    if (!deps.endOfDayReminderGenerator) {
      await ctx.reply("Генератор не настроен.");
      return;
    }

    const tz = await deps.userService.getAnalyticsTimezoneResolved(user.id);
    const localYmd = format(toZonedTime(new Date(), tz), "yyyy-MM-dd");

    await ctx.reply("Отправляю напоминание (конец дня)…");

    try {
      await sendEndOfDayReminderForUserId(
        user.id,
        {
          userService: deps.userService,
          workspaceService: deps.workspaceService,
          transactionRepo: deps.transactionRepo,
          bot: deps.bot!,
          endOfDayReminderGenerator: deps.endOfDayReminderGenerator,
        },
        {
          localYmd,
          telegramId: Number(user.telegramId),
          forDevTest: true,
        }
      );
      await ctx.reply("Готово.");
    } catch (err) {
      console.error("test_reminder_eod:", err);
      await ctx.reply("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    }
  };
}

/** /test_forecast — еженедельный прогноз (LLM). */
export function createTestForecastHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (!assertNonProd(ctx)) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    if (!deps.weeklyForecastGenerator) {
      await ctx.reply("Генератор не настроен.");
      return;
    }

    const wids = await deps.workspaceService.getWorkspaceIdsForUser(user.id);
    if (wids.length === 0) {
      await ctx.reply("Нет данных workspace — сначала сохраните трату через бота.");
      return;
    }

    const tz = await deps.userService.getAnalyticsTimezoneResolved(user.id);
    const localYmd = format(toZonedTime(new Date(), tz), "yyyy-MM-dd");

    await ctx.reply("Отправляю прогноз…");

    try {
      await sendWeeklyForecastForUserId(
        user.id,
        {
          analyticsInsightService: deps.analyticsInsightService,
          userService: deps.userService,
          workspaceService: deps.workspaceService,
          bot: deps.bot!,
          weeklyForecastGenerator: deps.weeklyForecastGenerator,
        },
        {
          localYmd,
          telegramId: Number(user.telegramId),
          forDevTest: true,
        }
      );
      await ctx.reply("Готово.");
    } catch (err) {
      console.error("test_forecast:", err);
      await ctx.reply("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    }
  };
}

/** /test_inactive_nudge — напоминание «зарегистрировался, но не ведёт учёт» (LLM). */
export function createTestInactiveNudgeHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (!assertNonProd(ctx)) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    if (!deps.inactiveUserNudgeGenerator) {
      await ctx.reply("Генератор не настроен.");
      return;
    }

    const tz = await deps.userService.getAnalyticsTimezoneResolved(user.id);
    const ym = format(toZonedTime(new Date(), tz), "yyyy-MM");

    await ctx.reply("Отправляю тестовое напоминание неактивным…");

    try {
      await sendInactiveUserMonthNudgeIfDue(
        user.id,
        Number(user.telegramId),
        ym,
        new Date(),
        {
          userService: deps.userService,
          transactionRepo: deps.transactionRepo,
          bot: deps.bot!,
          inactiveUserNudgeGenerator: deps.inactiveUserNudgeGenerator,
        },
        { forDevTest: true }
      );
      await ctx.reply("Готово.");
    } catch (err) {
      console.error("test_inactive_nudge:", err);
      await ctx.reply("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    }
  };
}
