import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import type { Application } from "express";
import { AppModule } from "../api/app.module";
import { AllExceptionsFilter } from "../api/filters/all-exceptions.filter";
import { config } from "@finance-bot/server-core";

function buildAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [];

  // Лендинг (finance-bot.by) и сам API живут на РАЗНЫХ доменах — лендинг шлёт
  // cross-origin запросы на /api/billing/*, поэтому его origin обязателен в CORS.
  // publicBaseUrl — это домен самого API; для CORS он не нужен, но не мешает.
  const urlEnvs = [
    config.publicBaseUrl,
    process.env["LANDING_BASE_URL"],
    process.env["NEXT_PUBLIC_BASE_URL"],
  ];
  for (const u of urlEnvs) {
    const v = u?.trim().replace(/\/$/, "");
    if (v && !origins.includes(v)) origins.push(v);
  }

  if (process.env["NODE_ENV"] !== "production") {
    origins.push(/^https?:\/\/localhost(:\d+)?$/);
  }

  return origins;
}

/** Поднимает Nest на переданном Express и слушает порт API. Контейнер задаётся в `main` до вызова. */
export async function startNestApplication(expressApp: Application): Promise<void> {
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bodyParser: false,
  });
  nestApp.setGlobalPrefix("api");
  nestApp.useGlobalFilters(new AllExceptionsFilter());
  nestApp.enableCors({
    origin: buildAllowedOrigins(),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  await nestApp.listen(config.port);
  console.log(
    `HTTP API на порту ${config.port} (/app, /api/...). Исходящие сообщения в Telegram — через сервис бота.`
  );
}
