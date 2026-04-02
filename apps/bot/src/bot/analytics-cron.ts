import cron from "node-cron";
import { format, toZonedTime } from "date-fns-tz";
import { DEFAULT_ANALYTICS_TIMEZONE } from "@finance-bot/server-core";
import { isLastDayOfMonth } from "./analytics-utils";
import { sendMonthlyReportForUserId } from "./analytics-monthly-report-send";
import { sendEndOfDayReminderForUserId } from "./analytics-eod-send";
import { sendWeeklyForecastForUserId } from "./analytics-forecast-send";
import type {
  AnalyticsInsightService,
  UserService,
  WorkspaceService,
  DeepSeekMonthlyReport,
  DeepSeekEndOfDayReminder,
  DeepSeekWeeklyForecast,
  DeepSeekInactiveUserNudge,
  TransactionRepository,
} from "@finance-bot/server-core";
import { sendInactiveUserMonthNudgeIfDue } from "./inactive-user-nudge-send";
import type { Bot } from "grammy";

const DELAY_BETWEEN_USERS_MS = 500;

export interface AnalyticsCronDeps {
  analyticsInsightService: AnalyticsInsightService;
  userService: UserService;
  workspaceService: WorkspaceService;
  transactionRepo: TransactionRepository;
  bot: Bot;
  monthlyReportGenerator?: DeepSeekMonthlyReport;
  endOfDayReminderGenerator: DeepSeekEndOfDayReminder;
  weeklyForecastGenerator: DeepSeekWeeklyForecast;
  inactiveUserNudgeGenerator: DeepSeekInactiveUserNudge;
}

/** Каждый час: в 20:00 по локали пользователя — напоминание, отчёт в конце месяца, воскресный forecast. */
export function startAnalyticsCron(deps: AnalyticsCronDeps): void {
  cron.schedule("12 * * * *", async () => {
    const utcNow = new Date();
    const users = await deps.userService.findAllWithAnyAnalyticsMessaging();

    for (const user of users) {
      try {
        const tz = user.analyticsTimezone?.trim() || DEFAULT_ANALYTICS_TIMEZONE;
        const zoned = toZonedTime(utcNow, tz);
        if (zoned.getHours() !== 20) continue;

        const localYmd = format(zoned, "yyyy-MM-dd");
        const ym = format(zoned, "yyyy-MM");
        const tgId = Number(user.telegramId);

        if (
          user.analyticsReminderEod &&
          user.lastAnalyticsReminderLocalDate !== localYmd
        ) {
          await sendEndOfDayReminderForUserId(user.id, deps, {
            localYmd,
            telegramId: tgId,
          });
        }

        if (
          user.analyticsMonthReport &&
          deps.monthlyReportGenerator &&
          isLastDayOfMonth(zoned) &&
          user.lastMonthlyReportSentYm !== ym
        ) {
          await sendMonthlyReportForUserId(user.id, deps);
        }

        if (
          user.analyticsForecastWeekly &&
          zoned.getDay() === 0 &&
          user.lastForecastSentLocalDate !== localYmd
        ) {
          await sendWeeklyForecastForUserId(user.id, deps, {
            localYmd,
            telegramId: tgId,
          });
        }
      } catch (err) {
        console.error(`Analytics cron user ${user.id}:`, err);
      }
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_USERS_MS));
    }

    const nudgeUsers = await deps.userService.findAllNonArchived();
    for (const user of nudgeUsers) {
      try {
        const tz = user.analyticsTimezone?.trim() || DEFAULT_ANALYTICS_TIMEZONE;
        const zoned = toZonedTime(utcNow, tz);
        if (zoned.getHours() !== 20 || !isLastDayOfMonth(zoned)) continue;

        const ym = format(zoned, "yyyy-MM");
        if (user.lastInactiveUserNudgeYm === ym) continue;

        await sendInactiveUserMonthNudgeIfDue(
          user.id,
          Number(user.telegramId),
          ym,
          utcNow,
          {
            userService: deps.userService,
            transactionRepo: deps.transactionRepo,
            bot: deps.bot,
            inactiveUserNudgeGenerator: deps.inactiveUserNudgeGenerator,
          }
        );
      } catch (err) {
        console.error(`Inactive user nudge ${user.id}:`, err);
      }
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_USERS_MS));
    }
  });
}
