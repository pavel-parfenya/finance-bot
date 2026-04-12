import { GrammyError } from "grammy";
import type { Bot } from "grammy";
import type {
  DeepSeekInactiveUserNudge,
  UserService,
  TransactionRepository,
} from "@finance-bot/server-core";
import { userQualifiesForInactiveMonthNudge } from "@finance-bot/server-core";

export function isTelegramBotBlockedError(err: unknown): boolean {
  if (!(err instanceof GrammyError)) return false;
  if (err.error_code !== 403) return false;
  const d = (err.description ?? "").toLowerCase();
  return d.includes("blocked") && d.includes("user");
}

export interface InactiveUserNudgeDeps {
  userService: UserService;
  transactionRepo: TransactionRepository;
  bot: Bot;
  inactiveUserNudgeGenerator: DeepSeekInactiveUserNudge;
}

/**
 * Последний день месяца ~20:00 локали: напоминание неактивным (всегда, без настройки).
 * При блокировке бота пользователь помечается archived (для метрик и отключения рассылок).
 * Вернулся в чат — findOrCreate снимает архив.
 */
export async function sendInactiveUserMonthNudgeIfDue(
  userId: number,
  telegramId: number,
  localYm: string,
  refUtc: Date,
  deps: InactiveUserNudgeDeps,
  opts?: { forDevTest?: boolean }
): Promise<void> {
  if (!opts?.forDevTest) {
    const ok = await userQualifiesForInactiveMonthNudge(
      userId,
      deps.transactionRepo,
      refUtc
    );
    if (!ok) return;
  }

  const voice = await deps.userService.getAnalyticsVoice(userId);
  const text = await deps.inactiveUserNudgeGenerator.generate(voice);

  try {
    await deps.bot.api.sendMessage(telegramId, text);
  } catch (e) {
    if (isTelegramBotBlockedError(e)) {
      await deps.userService.setArchived(userId, true);
      return;
    }
    throw e;
  }
  if (!opts?.forDevTest) {
    await deps.userService.setLastInactiveUserNudgeYm(userId, localYm);
  }
}
