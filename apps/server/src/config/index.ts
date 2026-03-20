import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const mode = (process.env["MODE"] ?? "polling") as "polling" | "webhook";

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
  get publicBaseUrl(): string {
    const explicit = process.env["PUBLIC_BASE_URL"];
    if (explicit) return explicit.replace(/\/$/, "");
    if (this.mode === "webhook" && this.webhookUrl) {
      return this.webhookUrl.replace(/\/webhook\/?$/, "");
    }
    return "";
  },
} as const;

export type Config = typeof config;
