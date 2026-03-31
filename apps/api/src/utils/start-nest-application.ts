import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import type { Application } from "express";
import { AppModule } from "../api/app.module";
import { AllExceptionsFilter } from "../api/filters/all-exceptions.filter";
import { config } from "@finance-bot/server-core";

/** Поднимает Nest на переданном Express и слушает порт API. Контейнер задаётся в `main` до вызова. */
export async function startNestApplication(expressApp: Application): Promise<void> {
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bodyParser: false,
  });
  nestApp.setGlobalPrefix("api");
  nestApp.useGlobalFilters(new AllExceptionsFilter());
  await nestApp.listen(config.port);
  console.log(
    `HTTP API на порту ${config.port} (/app, /api/...). Исходящие сообщения в Telegram — через сервис бота.`
  );
}
