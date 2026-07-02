/**
 * ⚠️ ВРЕМЕННЫЙ КОД — УДАЛИТЬ В СЛЕДУЮЩЕМ КОММИТЕ (вместе с вызовом в main.ts).
 *
 * Одноразовая рассылка анонса подписки Pro всем неархивным пользователям при
 * старте сервиса бота. Принцип тот же, что в админской «Сообщение от бота»:
 * шлём каждому, недоставленных архивируем. Под сообщением — inline-кнопка
 * «Подключить Pro», работающая как «Сменить план» в гейте фич (web_app на
 * страницу подписки Mini App).
 *
 * Повторные запуски (рестарт контейнера) защищены маркером в таблице
 * one_time_broadcast — она создаётся здесь же. После удаления кода таблицу
 * можно дропнуть вручную: DROP TABLE IF EXISTS one_time_broadcast.
 */
import type { Bot } from "grammy";
import type { DataSource } from "typeorm";
import type { UserService } from "@finance-bot/server-core";
import { buildUpgradeKeyboard } from "./bot/handlers/upgrade-prompt";
import type { BotDeps } from "./bot/bot";

const MARKER_KEY = "pro-announcement-2026-07";

const MESSAGE = `Привет! 👋 Это Бухгалтер Валентин.

У меня важная новость: теперь у меня есть подписка Pro. Мной по-прежнему можно пользоваться бесплатно, но с небольшими ограничениями: запись трат только текстом и до 100 транзакций в месяц.

Если хочешь пользоваться мной без ограничений, подключай Pro — с ней доступны голосовой ввод, безлимитное количество транзакций и все будущие возможности.

Оформить подписку можно, нажав на кнопку «Подключить Pro» внизу.

Спасибо за поддержку и что остаёшься со мной! ❤️`;

export async function runOneTimeProBroadcast(params: {
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
    console.log(`[pro-broadcast] Рассылка ${MARKER_KEY} уже выполнялась, пропускаю`);
    return;
  }

  // buildUpgradeKeyboard читает из deps только miniAppUrl.
  const keyboard = buildUpgradeKeyboard({ miniAppUrl } as BotDeps, "💳 Подключить Pro");
  const text = keyboard
    ? MESSAGE
    : `${MESSAGE}\n\nОформить подписку можно в Mini App: Настройки → Подписка.`;

  const users = await userService.findAllNonArchived();
  console.log(`[pro-broadcast] Отправляю анонс Pro ${users.length} пользователям…`);
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
  console.log(`[pro-broadcast] Готово: отправлено ${sent}, не доставлено ${failed}`);
}
