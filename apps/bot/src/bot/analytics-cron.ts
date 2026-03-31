import cron from "node-cron";
import { formatInsight } from "./analytics-voice-formatter";
import { isEndOfMonth } from "./analytics-utils";
import type {
  AnalyticsInsightService,
  UserService,
  WorkspaceService,
  DeepSeekMonthlyReport,
} from "@finance-bot/server-core";
import type { Bot } from "grammy";

const DELAY_BETWEEN_USERS_MS = 500;

export interface AnalyticsCronDeps {
  analyticsInsightService: AnalyticsInsightService;
  userService: UserService;
  workspaceService: WorkspaceService;
  bot: Bot;
  monthlyReportGenerator?: DeepSeekMonthlyReport;
}

export function startAnalyticsCron(deps: AnalyticsCronDeps): void {
  cron.schedule("0 20 * * *", async () => {
    const users = await deps.userService.findAllWithAnalyticsEnabled();
    for (const user of users) {
      try {
        const workspaceIds = await deps.workspaceService.getWorkspaceIdsForUser(user.id);
        if (workspaceIds.length === 0) continue;

        const defaultCurrency =
          (await deps.userService.getDefaultCurrency(user.id)) || "USD";
        const voice = await deps.userService.getAnalyticsVoice(user.id);

        let message: string;

        if (isEndOfMonth() && deps.monthlyReportGenerator) {
          const reportData = await deps.analyticsInsightService.getMonthlyReportData(
            workspaceIds,
            defaultCurrency
          );
          if (!reportData) continue;
          message = await deps.monthlyReportGenerator.generateReport(reportData, voice);
        } else {
          const insights = await deps.analyticsInsightService.computeInsights(
            workspaceIds,
            defaultCurrency
          );
          if (insights.length === 0) continue;

          const insight = insights[0];
          message = formatInsight(
            insight,
            voice as "official" | "strict" | "modern" | "modern_18"
          );
        }

        await deps.bot.api.sendMessage(Number(user.telegramId), message);
      } catch (err) {
        console.error(`Analytics cron for user ${user.id}:`, err);
      }
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_USERS_MS));
    }
  });
}
