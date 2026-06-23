import { InlineKeyboard, type Context } from "grammy";
import type { BotDeps } from "../bot";

/**
 * Inline-кнопка «Сменить план» под сообщением-гейтом фичи. Открывает страницу
 * подписки сайта НАПРЯМУЮ (обычная URL-кнопка типа `url` — встроенный браузер
 * Telegram / внешний браузер), а не как mini-app/WebView. URL — лендинг
 * `/subscribe` с короткоживущим billing-JWT (та же авторизация, что и при
 * открытии оплаты из Mini App).
 *
 * Возвращает `null`, если кнопку построить нельзя (не настроен JWT-секрет, нет
 * HTTPS-URL лендинга или неизвестен telegramId) — тогда вызывающий шлёт текстовый
 * фолбэк с подсказкой про Mini App.
 */
function buildUpgradeKeyboard(
  deps: BotDeps,
  telegramId: number | undefined
): InlineKeyboard | null {
  if (typeof telegramId !== "number" || !deps.billingTokenService?.isConfigured) {
    return null;
  }
  const base = deps.landingBaseUrl;
  // Telegram открывает url-кнопку только по HTTPS.
  if (!base || !base.startsWith("https://")) return null;
  const token = deps.billingTokenService.sign(telegramId);
  const url = `${base}/subscribe?token=${encodeURIComponent(token)}`;
  return new InlineKeyboard().url("💳 Сменить план", url);
}

/**
 * Отправляет сообщение-апселл «фича на платном тарифе» с кнопкой «Сменить план»
 * (открывает страницу сайта напрямую). Если кнопку построить нельзя — отправляет
 * текст с подсказкой оформить подписку в Mini App.
 */
export async function replyFeatureGated(
  ctx: Context,
  deps: BotDeps,
  telegramId: number | undefined,
  intro: string
): Promise<void> {
  const keyboard = buildUpgradeKeyboard(deps, telegramId);
  if (keyboard) {
    await ctx.reply(intro, { reply_markup: keyboard });
    return;
  }
  await ctx.reply(`${intro}\nОформить подписку можно в Mini App: Настройки → Подписка.`);
}
