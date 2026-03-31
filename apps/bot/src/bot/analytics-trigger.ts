import type { Bot } from "grammy";
import { formatInsight } from "./analytics-voice-formatter";
import { isEndOfMonth } from "./analytics-utils";
import type {
  AnalyticsInsightService,
  UserService,
  WorkspaceService,
  DeepSeekMonthlyReport,
} from "@finance-bot/server-core";

const DEBOUNCE_MS = process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 0; // 5 min в prod, без задержки в dev
const lastTriggerByUser = new Map<number, number>();

export interface AnalyticsTriggerDeps {
  analyticsInsightService: AnalyticsInsightService;
  userService: UserService;
  workspaceService: WorkspaceService;
  bot: Bot;
  monthlyReportGenerator?: DeepSeekMonthlyReport;
}

export async function triggerAnalyticsAfterTransaction(
  userId: number,
  workspaceId: number,
  deps: AnalyticsTriggerDeps,
  options?: { forceFullReport?: boolean }
): Promise<void> {
  const now = Date.now();
  const last = lastTriggerByUser.get(userId) ?? 0;
  if (now - last < DEBOUNCE_MS) return;

  const enabled = await deps.userService.getAnalyticsEnabled(userId);
  if (!enabled) return;

  const user = await deps.userService.findById(userId);
  if (!user?.telegramId) return;

  const workspaceIds = await deps.workspaceService.getWorkspaceIdsForUser(userId);
  if (workspaceIds.length === 0) return;

  const defaultCurrency = (await deps.userService.getDefaultCurrency(userId)) || "USD";
  const voice = await deps.userService.getAnalyticsVoice(userId);

  let message: string;

  const useFullReport =
    (isEndOfMonth() || options?.forceFullReport) && deps.monthlyReportGenerator;

  if (useFullReport) {
    const reportData = await deps.analyticsInsightService.getMonthlyReportData(
      workspaceIds,
      defaultCurrency
    );
    if (reportData) {
      message = await deps.monthlyReportGenerator!.generateReport(reportData, voice);
    } else {
      return;
    }
  } else {
    const insights = await deps.analyticsInsightService.computeInsights(
      workspaceIds,
      defaultCurrency
    );
    if (insights.length === 0) return;

    const insight = insights[0];
    message = formatInsight(
      insight,
      voice as "official" | "strict" | "modern" | "modern_18"
    );
  }

  try {
    await deps.bot.api.sendMessage(Number(user.telegramId), message);
    lastTriggerByUser.set(userId, now);
  } catch (err) {
    console.error("Failed to send analytics insight:", err);
  }
}
