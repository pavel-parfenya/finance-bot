import express from "express";
import {
  config,
  initDatabase,
  createCoreServices,
  shouldEmbedTelegramBotInApi,
} from "@finance-bot/server-core";
import { attachTelegramBotHttpRoutes } from "./attach-telegram-bot-http";
import { createBot } from "./bot/bot";
import { configureBotAfterInit } from "./bootstrap-bot";

async function bootstrap(): Promise<void> {
  if (shouldEmbedTelegramBotInApi()) {
    console.log(
      "Webhook и internal Telegram обрабатываются процессом API (см. apps/api). Процесс apps/bot не запускает HTTP."
    );
    return;
  }

  const dataSource = await initDatabase();
  const core = createCoreServices(config, dataSource);

  const miniAppUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/app` : "";
  console.log(
    `Mini App URL (меню Telegram и /app): ${miniAppUrl || "не задан — укажите PUBLIC_BASE_URL или RENDER_EXTERNAL_URL"}`
  );
  const bot = createBot(config.telegram.botToken, {
    ...core,
    miniAppUrl,
    superAdminUsername: config.superAdminUsername,
  });

  await bot.init();
  await configureBotAfterInit(bot, core);

  const httpApp = express();
  httpApp.use(express.json({ limit: "10mb" }));

  httpApp.get("/health", (_req, res) => {
    res.type("text/plain").send("OK");
  });

  attachTelegramBotHttpRoutes(httpApp, bot);

  await new Promise<void>((resolve) => {
    httpApp.listen(config.botHttpPort, () => {
      console.log(
        `Bot HTTP на порту ${config.botHttpPort} (health, internal send${
          config.mode === "webhook" ? ", webhook" : ""
        })`
      );
      resolve();
    });
  });

  if (config.mode === "polling") {
    await bot.start({ onStart: () => console.log("Бот запущен (polling)!") });
  } else {
    console.log(`Бот в режиме webhook, слушает ${config.webhookPath}`);
  }
}

bootstrap().catch((err) => {
  console.error("Критическая ошибка (bot):", err);
  process.exit(1);
});
