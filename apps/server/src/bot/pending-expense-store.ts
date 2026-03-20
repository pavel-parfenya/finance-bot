import { Expense } from "../domain/models";
import { TransactionRepository } from "../repositories/transaction-repository";

const CONFIRM_DELAY_MS = 30_000;

interface PendingEntry {
  userId: number;
  workspaceId: number;
  expense: Expense;
  transactionRepo: TransactionRepository;
  timeoutId: NodeJS.Timeout;
}

const store = new Map<string, PendingEntry>();

function key(chatId: number, messageId: number): string {
  return `${chatId}:${messageId}`;
}

/** Откладывает запись в БД на 30 сек. Отмена (cancelPending) отменяет запись. */
export function scheduleSave(
  chatId: number,
  messageId: number,
  userId: number,
  workspaceId: number,
  expense: Expense,
  transactionRepo: TransactionRepository,
  onAutoSave?: (
    chatId: number,
    messageId: number,
    expense: Expense
  ) => void | Promise<void>
): void {
  const k = key(chatId, messageId);
  const timeoutId = setTimeout(async () => {
    store.delete(k);
    try {
      await transactionRepo.save(workspaceId, userId, expense);
      await onAutoSave?.(chatId, messageId, expense);
    } catch (err) {
      console.error("Ошибка сохранения расхода:", err);
    }
  }, CONFIRM_DELAY_MS);

  store.set(k, {
    userId,
    workspaceId,
    expense,
    transactionRepo,
    timeoutId,
  });
}

export function cancelPending(chatId: number, messageId: number): boolean {
  const k = key(chatId, messageId);
  const entry = store.get(k);
  if (!entry) return false;
  clearTimeout(entry.timeoutId);
  store.delete(k);
  return true;
}

/** Сохраняет расход сразу и отменяет отложенное сохранение. Возвращает expense при успехе. */
export async function saveNow(
  chatId: number,
  messageId: number
): Promise<{ saved: boolean; expense?: Expense; userId?: number; workspaceId?: number }> {
  const k = key(chatId, messageId);
  const entry = store.get(k);
  if (!entry) return { saved: false };
  clearTimeout(entry.timeoutId);
  store.delete(k);
  try {
    await entry.transactionRepo.save(entry.workspaceId, entry.userId, entry.expense);
    return {
      saved: true,
      expense: entry.expense,
      userId: entry.userId,
      workspaceId: entry.workspaceId,
    };
  } catch (err) {
    console.error("Ошибка немедленного сохранения расхода:", err);
    return { saved: false };
  }
}
