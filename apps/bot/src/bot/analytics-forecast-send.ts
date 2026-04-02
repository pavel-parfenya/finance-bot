import type { Bot } from "grammy";
import { toZonedTime } from "date-fns-tz";
import type {
  AnalyticsInsightService,
  DeepSeekWeeklyForecast,
  UserService,
  WorkspaceService,
} from "@finance-bot/server-core";

export interface ForecastSendDeps {
  analyticsInsightService: AnalyticsInsightService;
  userService: UserService;
  workspaceService: WorkspaceService;
  bot: Bot;
  weeklyForecastGenerator: DeepSeekWeeklyForecast;
}

export async function sendWeeklyForecastForUserId(
  userId: number,
  deps: ForecastSendDeps,
  options: { localYmd: string; telegramId: number; forDevTest?: boolean }
): Promise<void> {
  const user = await deps.userService.findById(userId);
  if (!user?.analyticsForecastWeekly && !options.forDevTest) return;

  const workspaceIds = await deps.workspaceService.getWorkspaceIdsForUser(userId);
  if (workspaceIds.length === 0) return;

  const defaultCurrency = (await deps.userService.getDefaultCurrency(userId)) || "USD";
  const voice = await deps.userService.getAnalyticsVoice(userId);
  const tz = await deps.userService.getAnalyticsTimezoneResolved(userId);

  const reportData = await deps.analyticsInsightService.getMonthlyReportData(
    workspaceIds,
    defaultCurrency
  );
  if (!reportData) return;

  const zoned = toZonedTime(new Date(), tz);
  const y = zoned.getFullYear();
  const m = zoned.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysPassedInMonth = zoned.getDate();
  const daysLeftInMonth = daysInMonth - daysPassedInMonth + 1;

  const message = await deps.weeklyForecastGenerator.generate(reportData, voice, {
    daysLeftInMonth,
    daysPassedInMonth,
    daysInMonth,
  });
  await deps.bot.api.sendMessage(Number(options.telegramId), message);
  if (!options.forDevTest) {
    await deps.userService.setLastForecastSentLocalDate(userId, options.localYmd);
  }
}
