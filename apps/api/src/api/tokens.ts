/**
 * Ключи DI в Nest. Значение токена бота берётся из `.env` (переменная `TELEGRAM_BOT_TOKEN`)
 * после загрузки env в `@finance-bot/server-core`.
 */
export const BOT_TOKEN = "TELEGRAM_BOT_TOKEN";
/** Исходящие сообщения в Telegram через HTTP к сервису `apps/bot`. */
export const TELEGRAM_OUTBOUND = "TELEGRAM_OUTBOUND_PORT";
