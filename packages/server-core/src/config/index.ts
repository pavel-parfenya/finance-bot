import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv, parse as parseEnvFile } from "dotenv";
import { mergeRootDotenvPublicBaseUrl, resolvePublicBaseUrl } from "./public-base-url";

/** Корень репозитория, затем опционально `apps/api` и `apps/bot` (перекрывают). */
const repoRootEnv = path.resolve(__dirname, "../../../../.env");
const apiEnv = path.resolve(__dirname, "../../../../apps/api/.env");
const botEnv = path.resolve(__dirname, "../../../../apps/bot/.env");

loadEnv({ path: repoRootEnv });
loadEnv({ path: apiEnv, override: true });
loadEnv({ path: botEnv, override: true });

/**
 * Публичный URL часто меняют только в корневом `.env` (туннель ngrok/tuna и т.п.).
 * Раньше значение из `apps/bot/.env` / `apps/api/.env` перетирало корень и Mini App
 * продолжал открывать старый хост. Если в корневом файле задан `PUBLIC_BASE_URL` —
 * он снова имеет приоритет.
 */
function applyRootPublicBaseUrl(): void {
  if (!existsSync(repoRootEnv)) return;
  try {
    const parsed = parseEnvFile(readFileSync(repoRootEnv, "utf8"));
    mergeRootDotenvPublicBaseUrl(parsed, process.env);
  } catch {
    /* ignore malformed .env */
  }
}

applyRootPublicBaseUrl();

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const mode = (process.env["MODE"] ?? "polling") as "polling" | "webhook";

const apiMode = process.env["API_MODE"] === "test" ? "test" : "normal";

function readTestTelegramUserId(): number | null {
  if (apiMode !== "test") return null;
  const raw = process.env["TELEGRAM_USER_ID"];
  if (!raw?.trim()) {
    throw new Error("API_MODE=test requires TELEGRAM_USER_ID (Telegram numeric user id)");
  }
  const n = parseInt(raw, 10);
  if (isNaN(n) || n <= 0) {
    throw new Error("TELEGRAM_USER_ID must be a positive integer");
  }
  return n;
}

function getWebhookUrl(): string {
  const explicit = process.env["WEBHOOK_URL"];
  if (explicit) return explicit;

  const renderUrl = process.env["RENDER_EXTERNAL_URL"];
  if (renderUrl) return `${renderUrl}/webhook`;

  throw new Error(
    "В режиме webhook необходимо задать WEBHOOK_URL или RENDER_EXTERNAL_URL"
  );
}

export const config = {
  mode,
  /** `test`: Mini App API без init-data, от имени `testTelegramUserId` (локальная разработка). */
  apiMode: apiMode as "normal" | "test",
  testTelegramUserId: readTestTelegramUserId(),
  port: parseInt(process.env["PORT"] ?? "10000", 10),
  webhookPath: "/webhook",
  webhookUrl: mode === "webhook" ? getWebhookUrl() : "",
  webhookSecret: process.env["WEBHOOK_SECRET"] ?? "",
  databaseUrl: requireEnv("DATABASE_URL"),
  /** SSL для PostgreSQL. По умолчанию: false для localhost, true для облачных БД. Явно: DATABASE_SSL=true|false */
  databaseSsl:
    process.env["DATABASE_SSL"] === "true"
      ? true
      : process.env["DATABASE_SSL"] === "false"
        ? false
        : !requireEnv("DATABASE_URL").includes("localhost"),
  telegram: {
    botToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  },
  deepseek: {
    apiKey: requireEnv("DEEPSEEK_API_KEY"),
  },
  whisper: {
    apiKey: requireEnv("WHISPER_API_KEY"),
    baseUrl: process.env["WHISPER_BASE_URL"] ?? "https://api.groq.com/openai/v1",
  },
  /** @username для доступа к /app-stats (без @) */
  superAdminUsername: process.env["SUPER_ADMIN_USERNAME"]?.replace(/^@/, "") ?? null,
  /** Базовый URL **API** (Mini App, `/app`, `/api`). Не путать с URL webhook — он теперь на сервисе бота. */
  get publicBaseUrl(): string {
    return resolvePublicBaseUrl(process.env);
  },
  /** HTTP-порт сервиса бота (webhook, health, internal send). */
  botHttpPort: parseInt(process.env["BOT_HTTP_PORT"] ?? "10001", 10),
  /** Базовый URL сервиса бота для вызовов из API (например http://127.0.0.1:10001). */
  botServiceUrl: (process.env["BOT_SERVICE_URL"] ?? "http://127.0.0.1:10001").replace(
    /\/$/,
    ""
  ),
  /** Секрет для POST /internal/telegram/send (API → bot). */
  internalBotSecret: process.env["INTERNAL_BOT_SECRET"] ?? "",
} as const;

export type Config = typeof config;

/**
 * Один публичный URL (например Render): webhook и Mini App на процессе API.
 * Отключить: `EMBED_TELEGRAM_BOT=false` (отдельный контейнер/процесс бота).
 */
export function shouldEmbedTelegramBotInApi(): boolean {
  return mode === "webhook" && process.env["EMBED_TELEGRAM_BOT"] !== "false";
}

/** База URL для POST /internal/telegram/send из API (тот же хост при встраивании). */
export function resolveBotServiceBaseUrl(): string {
  if (shouldEmbedTelegramBotInApi()) {
    const p = process.env["PORT"] ?? "10000";
    return `http://127.0.0.1:${p}`.replace(/\/$/, "");
  }
  return (process.env["BOT_SERVICE_URL"] ?? "http://127.0.0.1:10001").replace(/\/$/, "");
}
