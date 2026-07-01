import { InlineKeyboard, type Context } from "grammy";
import type { BotDeps } from "../bot";

/**
 * Inline-кнопка «Сменить план» под сообщением-гейтом фичи. Открывает Telegram
 * Mini App на странице настроек подписки (`web_app`/WebView внутри Telegram), а не
 * страницу сайта напрямую. Внутри Mini App пользователь видит текущий тариф и по
 * кнопке «Сменить план» уже уходит на лендинг `/subscribe` с оплатой. Авторизация
 * в Mini App — через Telegram initData, billing-JWT здесь не нужен.
 *
 * Возвращает `null`, если кнопку построить нельзя (нет HTTPS-URL Mini App) — тогда
 * вызывающий шлёт текстовый фолбэк с подсказкой про Mini App.
 */
export function buildUpgradeKeyboard(
  deps: BotDeps,
  label = "💳 Сменить план"
): InlineKeyboard | null {
  const base = deps.miniAppUrl;
  // Telegram открывает web_app-кнопку только по HTTPS.
  if (!base || !base.startsWith("https://")) return null;
  // miniAppUrl — это `${publicBaseUrl}/app`; страница подписки Mini App живёт на
  // том же origin по маршруту `/settings/subscription` (SPA-фолбэк отдаёт shell).
  const appBase = base.replace(/\/app\/?$/, "");
  const url = `${appBase}/settings/subscription`;
  return new InlineKeyboard().webApp(label, url);
}

/**
 * Отправляет сообщение-апселл «фича на платном тарифе» с кнопкой «Сменить план»
 * (открывает Mini App на странице подписки). Если кнопку построить нельзя —
 * отправляет текст с подсказкой оформить подписку в Mini App.
 *
 * `telegramId` больше не используется для построения кнопки (Mini App авторизует
 * через initData), но сохранён в сигнатуре для совместимости с вызывающими.
 */
export async function replyFeatureGated(
  ctx: Context,
  deps: BotDeps,
  telegramId: number | undefined,
  intro: string
): Promise<void> {
  void telegramId;
  const keyboard = buildUpgradeKeyboard(deps);
  if (keyboard) {
    await ctx.reply(intro, { reply_markup: keyboard });
    return;
  }
  await ctx.reply(`${intro}\nОформить подписку можно в Mini App: Настройки → Подписка.`);
}
