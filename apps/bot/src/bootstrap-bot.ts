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
    featureService: core.featureService,
  });

  const miniAppUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/app` : "";
  // Telegram принимает кнопку Mini App только с HTTPS-URL. Локально (http://localhost)
  // или при сбое API не валим бот — логируем и продолжаем работу.
  if (miniAppUrl && miniAppUrl.startsWith("https://")) {
    try {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "Открыть",
          web_app: { url: miniAppUrl },
        },
      });
    } catch (err) {
      console.warn(`Не удалось установить кнопку Mini App (${miniAppUrl}):`, err);
    }
  } else if (miniAppUrl) {
    console.warn(
      `Кнопка Mini App пропущена: PUBLIC_BASE_URL не HTTPS (${miniAppUrl}). Telegram требует HTTPS.`
    );
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
