import type { EventRepository } from "../../repositories/event-repository";
import type { TransactionRepository } from "../../repositories/transaction-repository";
import type { DebtRepository } from "../../repositories/debt-repository";
import type { UserService } from "../user/user-service";
import type { WorkspaceService } from "../workspace/workspace-service";
import type { FeatureService } from "../feature/feature-service";

export interface EventServiceDeps {
  eventRepo: EventRepository;
  transactionRepo: TransactionRepository;
  debtRepo: DebtRepository;
  userService: UserService;
  workspaceService: WorkspaceService;
  featureService: FeatureService;
  /** Источник курсов валют; по умолчанию — fetchExchangeRates. Инъекция для тестов. */
  fetchRates?: () => Promise<Record<string, number>>;
}

/** Данные для отправки приглашения (Telegram-уведомление шлёт API-слой). */
export interface EventInviteResult {
  invitationId: number;
  inviteeTelegramId: number;
  inviterName: string;
  eventName: string;
}

/** Результат ответа на приглашение (для bot-хендлера). */
export interface EventInviteResponseResult {
  ok: boolean;
  eventId?: number;
  eventName?: string;
  error?: string;
}

/** Данные созданного из расчёта долга (Telegram-уведомление шлёт API-слой). */
export interface EventDebtResult {
  debtId: number;
  creditorTelegramId: number;
  debtorName: string;
  amount: number;
  currency: string;
  eventName: string;
}
