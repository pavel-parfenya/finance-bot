import type { Bot } from "grammy";
import { config, type CoreServices } from "@finance-bot/server-core";
import { startAnalyticsCron } from "./bot/analytics-cron";

/** Cron, меню Mini App, setWebhook / deleteWebhook. Вызывать после `createBot` и `bot.init()`. */
export async function configureBotAfterInit(bot: Bot, core: CoreServices): Promise<void> {
  if (config.apiMode === "test") {
    console.warn(
      `[API_MODE=test] Mini App API без проверки init-data; TELEGRAM_USER_ID=${config.testTelegramUserId}`
    );
  }

  startAnalyticsCron({
    analyticsInsightService: core.analyticsInsightService,
    userService: core.userService,
    workspaceService: core.workspaceService,
    transactionRepo: core.transactionRepo,
    bot,
    monthlyReportGenerator: core.monthlyReportGenerator,
    endOfDayReminderGenerator: core.endOfDayReminderGenerator,
    weeklyForecastGenerator: core.weeklyForecastGenerator,
    inactiveUserNudgeGenerator: core.inactiveUserNudgeGenerator,
  });

  const miniAppUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/app` : "";
  if (miniAppUrl) {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "Открыть",
        web_app: { url: miniAppUrl },
      },
    });
  }

  if (config.mode === "webhook") {
    await bot.api.setWebhook(config.webhookUrl, {
      secret_token: config.webhookSecret || undefined,
    });
    console.log(`Webhook установлен: ${config.webhookUrl}`);
  } else {
    await bot.api.deleteWebhook();
    console.log("Запуск бота в режиме polling...");
  }
}
