import type { Bot } from "grammy";
import { format, toZonedTime } from "date-fns-tz";
import type {
  AnalyticsInsightService,
  DeepSeekMonthlyReport,
  UserService,
  WorkspaceService,
} from "@finance-bot/server-core";

export interface MonthlyReportSendDeps {
  analyticsInsightService: AnalyticsInsightService;
  userService: UserService;
  workspaceService: WorkspaceService;
  bot: Bot;
  monthlyReportGenerator?: DeepSeekMonthlyReport;
}

/** Отправляет развёрнутый месячный отчёт пользователю. */
export async function sendMonthlyReportForUserId(
  userId: number,
  deps: MonthlyReportSendDeps,
  options?: { forDevTest?: boolean }
): Promise<void> {
  if (!deps.monthlyReportGenerator) {
    return;
  }

  const user = await deps.userService.findById(userId);
  if (!user?.telegramId) return;

  if (!user.analyticsMonthReport && !options?.forDevTest) return;

  const workspaceIds = await deps.workspaceService.getWorkspaceIdsForUser(userId);
  if (workspaceIds.length === 0) return;

  const defaultCurrency = (await deps.userService.getDefaultCurrency(userId)) || "USD";
  const voice = await deps.userService.getAnalyticsVoice(userId);

  const reportData = await deps.analyticsInsightService.getMonthlyReportData(
    workspaceIds,
    defaultCurrency
  );
  if (!reportData) return;

  const message = await deps.monthlyReportGenerator.generateReport(reportData, voice);
  await deps.bot.api.sendMessage(Number(user.telegramId), message);

  if (!options?.forDevTest) {
    const tz = await deps.userService.getAnalyticsTimezoneResolved(userId);
    const zoned = toZonedTime(new Date(), tz);
    await deps.userService.setLastMonthlyReportSentYm(userId, format(zoned, "yyyy-MM"));
  }
}
