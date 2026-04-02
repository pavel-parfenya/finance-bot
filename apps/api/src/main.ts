import "reflect-metadata";
import express from "express";
import {
  config,
  initDatabase,
  createApiServices,
  createCoreServices,
  shouldEmbedTelegramBotInApi,
} from "@finance-bot/server-core";
import { attachTelegramBotHttpRoutes } from "apps-bot/attach-http";
import { createBot } from "apps-bot/bot";
import { configureBotAfterInit } from "apps-bot/bootstrap-bot";
import { setApiContainer } from "./di/api-container.context";
import { setupExpressLayer } from "./utils/setup-express-layer";
import { startNestApplication } from "./utils/start-nest-application";

async function bootstrap(): Promise<void> {
  const dataSource = await initDatabase();
  const apiServices = createApiServices(config, dataSource);
  setApiContainer(apiServices);

  const expressApp = express();
  expressApp.use(express.json({ limit: "10mb" }));

  if (shouldEmbedTelegramBotInApi()) {
    const core = createCoreServices(config, dataSource);
    const miniAppUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/app` : "";
    console.log(
      `Mini App URL: ${miniAppUrl || "не задан — укажите PUBLIC_BASE_URL или RENDER_EXTERNAL_URL"}`
    );
    const bot = createBot(config.telegram.botToken, {
      ...core,
      miniAppUrl,
    });
    await bot.init();
    await configureBotAfterInit(bot, core);
    attachTelegramBotHttpRoutes(expressApp, bot);
  }

  setupExpressLayer(expressApp);

  await startNestApplication(expressApp);
}

bootstrap().catch((err) => {
  console.error("Критическая ошибка (api):", err);
  process.exit(1);
});
