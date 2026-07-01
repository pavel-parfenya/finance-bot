import type { Context } from "grammy";
import type { BotDeps } from "../bot";
import { buildUpgradeKeyboard } from "./upgrade-prompt";

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** Данные о превышении месячной квоты транзакций. */
export interface MonthlyLimitReached {
  /** Лимит тарифа (например 100). */
  limit: number;
  /** Момент сброса квоты — начало следующего месяца. */
  resetsAt: Date;
}

/**
 * Проверяет месячную квоту транзакций автора. Возвращает данные о превышении,
 * если создавать новую транзакцию уже нельзя; иначе `null` — можно сохранять.
 *
 * `null` также при безлимитном тарифе, отключённой монетизации или недоступном
 * конфиге Strapi (мягкая деградация — не блокируем пользователей вслепую).
 */
export async function checkMonthlyTransactionLimit(
  deps: BotDeps,
  userId: number
): Promise<MonthlyLimitReached | null> {
  const limit = await deps.featureService.getMonthlyTransactionLimit(userId);
  if (limit == null) return null; // безлимит

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const used = await deps.transactionRepo.countByAuthorCreatedSince(userId, monthStart);
  if (used < limit) return null; // ещё в пределах лимита

  const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { limit, resetsAt };
}

function formatResetDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Сообщение о достижении месячного лимита: указывает лимит, дату сброса и
 * предлагает оформить подписку (кнопка в Mini App или текстовый фолбэк).
 */
export async function replyMonthlyLimitReached(
  ctx: Context,
  deps: BotDeps,
  reached: MonthlyLimitReached
): Promise<void> {
  const text =
    `🚫 Достигнут лимит бесплатного тарифа: ${reached.limit} транзакций в месяц.\n\n` +
    `Новые записи снова можно будет добавлять с ${formatResetDate(reached.resetsAt)}.\n\n` +
    "Чтобы вести учёт без ограничений уже сейчас — оформите подписку.";

  const keyboard = buildUpgradeKeyboard(deps, "💎 Оформить подписку");
  if (keyboard) {
    await ctx.reply(text, { reply_markup: keyboard });
    return;
  }
  await ctx.reply(`${text}\nОформить подписку можно в Mini App: Настройки → Подписка.`);
}
