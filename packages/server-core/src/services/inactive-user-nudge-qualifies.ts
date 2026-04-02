import { APP_STATS_ACTIVE_HOURS } from "./app-stats-service";
import type { TransactionRepository } from "../repositories/transaction-repository";

/**
 * Пустой (нет своих транзакций) или неактивный (нет своих транзакций в окне APP_STATS_ACTIVE_HOURS до ref).
 * Совпадает с логикой карточек «пустые / неактивные» в статистике.
 */
export async function userQualifiesForInactiveMonthNudge(
  userId: number,
  transactionRepo: TransactionRepository,
  refUtc: Date
): Promise<boolean> {
  const hasAny = await transactionRepo.userHasAnyTransactionAsAuthor(userId);
  if (!hasAny) return true;
  const ms = APP_STATS_ACTIVE_HOURS * 60 * 60 * 1000;
  const since = new Date(refUtc.getTime() - ms);
  const hasInWindow = await transactionRepo.userHasTransactionAsAuthorBetween(
    userId,
    since,
    refUtc
  );
  return !hasInWindow;
}
