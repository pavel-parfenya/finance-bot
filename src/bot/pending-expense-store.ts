import { Expense } from "../domain/models";
import { ISheetManager } from "../domain/interfaces";
import { TransactionRepository } from "../repositories/transaction-repository";

const CONFIRM_DELAY_MS = 30_000;

interface PendingEntry {
  userId: number;
  workspaceId: number;
  expense: Expense;
  sheetId: string;
  sheetManager: ISheetManager;
  transactionRepo: TransactionRepository;
  timeoutId: NodeJS.Timeout;
}

const store = new Map<string, PendingEntry>();

function key(chatId: number, messageId: number): string {
  return `${chatId}:${messageId}`;
}

/** Откладывает запись в Sheets и БД на 30 сек. Отмена (cancelPending) отменяет обе записи. */
export function scheduleSave(
  chatId: number,
  messageId: number,
  userId: number,
  workspaceId: number,
  sheetId: string,
  expense: Expense,
  sheetManager: ISheetManager,
  transactionRepo: TransactionRepository
): void {
  const k = key(chatId, messageId);
  const timeoutId = setTimeout(async () => {
    store.delete(k);
    try {
      await transactionRepo.save(workspaceId, userId, expense);
      if (sheetId?.trim()) {
        await sheetManager.appendExpense(sheetId, expense);
      }
    } catch (err) {
      console.error("Ошибка сохранения расхода:", err);
    }
  }, CONFIRM_DELAY_MS);

  store.set(k, {
    userId,
    workspaceId,
    expense,
    sheetId,
    sheetManager,
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
