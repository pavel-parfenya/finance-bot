import "reflect-metadata";
import express from "express";
import { config, initDatabase, createApiServices } from "@finance-bot/server-core";
import { setApiContainer } from "./di/api-container.context";
import { setupExpressLayer } from "./utils/setup-express-layer";
import { startNestApplication } from "./utils/start-nest-application";

async function bootstrap(): Promise<void> {
  const dataSource = await initDatabase();
  const apiServices = createApiServices(config, dataSource);
  setApiContainer(apiServices);

  const expressApp = express();
  expressApp.use(express.json({ limit: "10mb" }));
  setupExpressLayer(expressApp);

  await startNestApplication(expressApp);
}

bootstrap().catch((err) => {
  console.error("Критическая ошибка (api):", err);
  process.exit(1);
});
