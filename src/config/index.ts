import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
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
  googleSheets: {
    spreadsheetId: requireEnv("GOOGLE_SHEETS_SPREADSHEET_ID"),
    worksheetName: process.env["GOOGLE_SHEETS_WORKSHEET_NAME"] ?? "Расходы",
    serviceAccountEmail: requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: requireEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  },
} as const;

export type Config = typeof config;
