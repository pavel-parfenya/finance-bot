/**
 * ⚠️ ВРЕМЕННЫЙ КОД — УДАЛИТЬ В СЛЕДУЮЩЕМ КОММИТЕ (вместе с вызовом в main.ts).
 *
 * Одноразовая рассылка анонса фичи «События» всем неархивным пользователям при
 * старте сервиса бота. Принцип тот же, что у анонса Pro и админской «Сообщение от
 * бота»: шлём каждому, недоставленных архивируем. Под сообщением — inline-кнопка
 * «Оформить подписку», открывающая страницу подписки Mini App (web_app).
 *
 * Повторные запуски (рестарт контейнера) защищены маркером в таблице
 * one_time_broadcast. После удаления кода строку маркера можно удалить вручную:
 * DELETE FROM one_time_broadcast WHERE key = 'events-announcement-2026-07'.
 */
import { InlineKeyboard, type Bot } from "grammy";
import type { DataSource } from "typeorm";
import type { UserService } from "@finance-bot/server-core";

const MARKER_KEY = "events-announcement-2026-07";

const MESSAGE = `Привет! Это Валентин 👋

Запустил для вас новую штуку — События. Если скидываетесь компанией (поездка, ужин, подарок) — больше не нужно считать вручную, кто кому должен.

Создаёте событие в разделе «События», зовёте друзей по @username, а дальше просто пишете мне траты как обычно — я сам всё привяжу и в конце посчитаю, кто кому сколько переводит.

События живут в приложении — откройте его кнопкой «Открыть» рядом с полем ввода или сразу перейдите к ним по кнопке ниже.

P.S. События доступны по подписке PRO.`;

/**
 * Две inline-кнопки под анонсом: «Открыть События» (web_app на страницу событий
 * Mini App) и «Оформить подписку» (web_app на страницу подписки). Обе открываются
 * как Telegram Mini App (web_app), поэтому Telegram требует HTTPS-URL — иначе
 * возвращаем null и вызывающий шлёт текстовый фолбэк. Маршруты живут на том же
 * origin, что и Mini App (см. buildUpgradeKeyboard): `/events` и
 * `/settings/subscription`, `/app` из базового URL отбрасывается.
 */
function buildBroadcastKeyboard(miniAppUrl: string): InlineKeyboard | null {
  if (!miniAppUrl || !miniAppUrl.startsWith("https://")) return null;
  const appBase = miniAppUrl.replace(/\/app\/?$/, "");
  return new InlineKeyboard()
    .webApp("📅 Открыть События", `${appBase}/events`)
    .row()
    .webApp("💳 Оформить подписку", `${appBase}/settings/subscription`);
}

export async function runOneTimeEventsBroadcast(params: {
  bot: Bot;
  userService: UserService;
  dataSource: DataSource;
  miniAppUrl: string;
}): Promise<void> {
  const { bot, userService, dataSource, miniAppUrl } = params;

  await dataSource.query(
    `CREATE TABLE IF NOT EXISTS one_time_broadcast (key TEXT PRIMARY KEY, sent_at TIMESTAMPTZ NOT NULL DEFAULT now())`
  );
  // Атомарно «занимаем» рассылку: если маркер уже есть — второй запуск ничего не шлёт.
  const claimed: Array<{ key: string }> = await dataSource.query(
    `INSERT INTO one_time_broadcast (key) VALUES ($1) ON CONFLICT (key) DO NOTHING RETURNING key`,
    [MARKER_KEY]
  );
  if (claimed.length === 0) {
    console.log(`[events-broadcast] Рассылка ${MARKER_KEY} уже выполнялась, пропускаю`);
    return;
  }

  const keyboard = buildBroadcastKeyboard(miniAppUrl);
  const text = keyboard
    ? MESSAGE
    : `${MESSAGE}\n\nОткрыть События и оформить подписку можно в Mini App: кнопка «Открыть» рядом с полем ввода.`;

  const users = await userService.findAllNonArchived();
  console.log(
    `[events-broadcast] Отправляю анонс «События» ${users.length} пользователям…`
  );
  let sent = 0;
  let failed = 0;
  for (const user of users) {
    const chatId = Number(user.telegramId);
    try {
      await bot.api.sendMessage(
        chatId,
        text,
        keyboard ? { reply_markup: keyboard } : undefined
      );
      sent += 1;
    } catch {
      failed += 1;
      try {
        await userService.setArchived(user.id, true);
      } catch {
        /* не блокируем рассылку */
      }
    }
    // ~20 сообщений/сек, чтобы не упереться в глобальный лимит Telegram (30/сек)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  console.log(`[events-broadcast] Готово: отправлено ${sent}, не доставлено ${failed}`);
}
