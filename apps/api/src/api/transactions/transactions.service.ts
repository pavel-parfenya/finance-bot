import { Inject, Injectable } from "@nestjs/common";
import type {
  TransactionFilters,
  TransactionDto,
  TransactionUpdateRequest,
  TransactionsResponse,
} from "@finance-bot/shared";
import { buildPeriodRange } from "@finance-bot/shared";
import {
  aggregateByCategoryAndCurrency,
  TransactionRepository,
  UserService,
} from "@finance-bot/server-core";
import { buildAccess } from "../common/workspace-access";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import type { TelegramOutboundPort } from "../../di/telegram-outbound.port";
import { TELEGRAM_OUTBOUND } from "../tokens";

const EXCHANGE_API = "https://open.er-api.com/v6/latest/USD";
const DEFAULT_PAGE_SIZE = 20;

/** Поле CSV: в кавычках, если есть разделитель/кавычка/перенос. */
function csvCell(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * CSV под Excel: BOM (иначе кириллица ломается), разделитель `;` (RU-локаль),
 * дробная часть через запятую, чтобы Excel распознал число.
 */
export function transactionsToCsv(
  rows: Array<{
    occurredAt: Date | string;
    type?: string;
    category: string;
    description: string;
    amount: number | string;
    currency: string;
    store?: string;
    personDisplayName?: string;
  }>
): string {
  const header = [
    "Дата",
    "Тип",
    "Категория",
    "Описание",
    "Сумма",
    "Валюта",
    "Магазин",
    "Кто",
  ];
  const lines = rows.map((t) =>
    [
      new Date(t.occurredAt).toISOString().slice(0, 16).replace("T", " "),
      t.type === "income" ? "Доход" : "Расход",
      t.category,
      t.description,
      String(t.amount).replace(".", ","),
      t.currency,
      t.store ?? "",
      t.personDisplayName ?? "",
    ]
      .map(csvCell)
      .join(";")
  );
  return "\uFEFF" + [header.join(";"), ...lines].join("\r\n");
}

async function fetchExchangeRates(): Promise<Record<string, number>> {
  const res = await fetch(EXCHANGE_API);
  if (!res.ok) throw new Error("Ошибка загрузки курсов");
  const data = (await res.json()) as { rates?: Record<string, number> };
  const rates = data.rates ?? {};
  rates["USD"] = 1;
  return rates;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionRepo: TransactionRepository,
    private readonly userService: UserService,
    @Inject(TELEGRAM_OUTBOUND) private readonly telegram: TelegramOutboundPort
  ) {}

  /** Все траты/доходы пользователя (с учётом прав доступа) — CSV-файлом в чат с ботом. */
  async export(
    resolved: ResolvedTelegramUser
  ): Promise<{ ok?: boolean; error?: string }> {
    const user = await this.userService.findById(resolved.userId);
    if (!user) return { error: "Пользователь не найден" };
    const rows = await this.transactionRepo.findByWorkspaceIdsForPeriod(
      resolved.workspaceIds,
      new Date(0),
      new Date(8640000000000000),
      {},
      undefined,
      buildAccess(resolved.workspaceIds, resolved.fullAccessWorkspaceIds, resolved.userId)
    );
    if (rows.length === 0) return { error: "Нет записей для экспорта" };
    const date = new Date().toISOString().slice(0, 10);
    try {
      await this.telegram.sendDocument(
        Number(user.telegramId),
        `transactions-${date}.csv`,
        transactionsToCsv(rows),
        `Экспорт: ${rows.length} записей. Время — UTC.`
      );
    } catch (err) {
      console.error("transactions export:", err);
      return { error: "Не удалось отправить файл. Попробуйте позже." };
    }
    return { ok: true };
  }

  async list(
    resolved: ResolvedTelegramUser,
    filters?: TransactionFilters
  ): Promise<TransactionsResponse | { error: string }> {
    const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, 100);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const pagination = { limit: limit + 1, offset };

    const access = buildAccess(
      resolved.workspaceIds,
      resolved.fullAccessWorkspaceIds,
      resolved.userId
    );

    const toDto = (
      t: Awaited<ReturnType<typeof this.transactionRepo.findByWorkspaceIds>>[number]
    ) => {
      const at =
        t.occurredAt instanceof Date ? t.occurredAt : new Date(t.occurredAt as string);
      const isoUtc = at.toISOString();
      const tx = t as { personDisplayName?: string; type?: string };
      return {
        id: t.id,
        date: isoUtc,
        description: t.description,
        category: t.category,
        amount: String(t.amount),
        currency: t.currency,
        type: (tx.type === "income" ? "income" : "expense") as "expense" | "income",
        personDisplayName: tx.personDisplayName ?? undefined,
      };
    };

    let rows: Awaited<ReturnType<typeof this.transactionRepo.findByWorkspaceIds>>;
    if (filters?.period && filters.period !== "all") {
      const { start, end } = buildPeriodRange(
        filters.period,
        filters.startDate,
        filters.endDate
      );
      rows = await this.transactionRepo.findByWorkspaceIdsForPeriod(
        resolved.workspaceIds,
        start,
        end,
        {
          category: filters.category,
          currency: filters.currency,
          userId: filters.userId,
          type: filters.type,
          search: filters.search,
        },
        pagination,
        access
      );
    } else {
      if (
        filters?.category ||
        filters?.currency ||
        filters?.userId ||
        filters?.type ||
        filters?.search
      ) {
        const farPast = new Date(0);
        const farFuture = new Date(8640000000000000);
        rows = await this.transactionRepo.findByWorkspaceIdsForPeriod(
          resolved.workspaceIds,
          farPast,
          farFuture,
          {
            category: filters.category,
            currency: filters.currency,
            userId: filters.userId,
            type: filters.type,
            search: filters.search,
          },
          pagination,
          access
        );
      } else {
        rows = await this.transactionRepo.findByWorkspaceIdsPaginated(
          resolved.workspaceIds,
          pagination,
          access,
          { type: filters?.type }
        );
      }
    }

    const hasMore = rows.length > limit;
    const transactions = rows.slice(0, limit).map(toDto);
    return { transactions, hasMore };
  }

  async analytics(
    resolved: ResolvedTelegramUser,
    periodType: string,
    startDateParam?: string,
    endDateParam?: string,
    userIdFilter?: number
  ): Promise<{
    byCategory?: Array<{ category: string; amount: string }>;
    byCurrency?: Array<{ currency: string; amount: string }>;
    totalInDefault?: string;
    defaultCurrency?: string;
    periodLabel?: string;
    error?: string;
  }> {
    const defaultCurrency =
      (await this.userService.getDefaultCurrency(resolved.userId)) || "USD";

    const { start, end, periodLabel } = buildPeriodRange(
      periodType,
      startDateParam,
      endDateParam
    );

    const access = buildAccess(
      resolved.workspaceIds,
      resolved.fullAccessWorkspaceIds,
      resolved.userId
    );

    const transactions = await this.transactionRepo.findByWorkspaceIdsForPeriod(
      resolved.workspaceIds,
      start,
      end,
      { userId: userIdFilter },
      undefined,
      access
    );

    let rates: Record<string, number> = {};
    try {
      rates = await fetchExchangeRates();
    } catch {
      rates["USD"] = 1;
    }

    const aggregated = aggregateByCategoryAndCurrency(
      transactions,
      rates,
      defaultCurrency
    );

    return {
      ...aggregated,
      defaultCurrency,
      periodLabel,
    };
  }

  async categories(
    resolved: ResolvedTelegramUser
  ): Promise<{ categories?: string[]; error?: string }> {
    const access = buildAccess(
      resolved.workspaceIds,
      resolved.fullAccessWorkspaceIds,
      resolved.userId
    );
    const categories = await this.transactionRepo.getUniqueCategories(
      resolved.workspaceIds,
      access
    );
    return { categories };
  }

  async update(
    resolved: ResolvedTelegramUser,
    transactionIdStr: string,
    updates: TransactionUpdateRequest
  ): Promise<{ transaction?: TransactionDto; error?: string }> {
    const id = parseInt(transactionIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID транзакции" };

    const tx = await this.transactionRepo.findByIdAndWorkspaceIds(
      id,
      resolved.workspaceIds
    );
    if (!tx) return { error: "Транзакция не найдена или доступ запрещён" };
    if (
      !resolved.fullAccessWorkspaceIds.includes(tx.workspaceId) &&
      tx.userId !== resolved.userId
    ) {
      return { error: "Доступ запрещён" };
    }

    const toUpdate: {
      description?: string;
      category?: string;
      amount?: number;
      currency?: string;
      date?: Date;
      type?: string;
    } = {};
    if (updates.description !== undefined) toUpdate.description = updates.description;
    if (updates.category !== undefined) toUpdate.category = updates.category;
    if (updates.amount !== undefined) {
      const amt = Number(updates.amount);
      if (isNaN(amt) || amt < 0) return { error: "Некорректная сумма" };
      toUpdate.amount = amt;
    }
    if (updates.currency !== undefined) toUpdate.currency = updates.currency;
    if (updates.type === "expense" || updates.type === "income")
      toUpdate.type = updates.type;
    if (updates.date !== undefined) {
      const d = new Date(updates.date);
      if (isNaN(d.getTime())) return { error: "Некорректная дата" };
      toUpdate.date = d;
    }

    const updated = await this.transactionRepo.update(id, toUpdate);
    if (!updated) return { error: "Ошибка обновления" };

    const at =
      updated.occurredAt instanceof Date
        ? updated.occurredAt
        : new Date(updated.occurredAt as string);
    const isoUtc = at.toISOString();
    const txWithExtra = updated as { personDisplayName?: string; type?: string };
    return {
      transaction: {
        id: updated.id,
        date: isoUtc,
        description: updated.description,
        category: updated.category,
        amount: String(updated.amount),
        currency: updated.currency,
        type: (txWithExtra.type === "income" ? "income" : "expense") as
          | "expense"
          | "income",
        personDisplayName: txWithExtra.personDisplayName ?? undefined,
      },
    };
  }

  async remove(
    resolved: ResolvedTelegramUser,
    transactionIdStr: string
  ): Promise<{ ok?: boolean; error?: string }> {
    const id = parseInt(transactionIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID транзакции" };

    const tx = await this.transactionRepo.findByIdAndWorkspaceIds(
      id,
      resolved.workspaceIds
    );
    if (!tx) return { error: "Транзакция не найдена или доступ запрещён" };
    if (
      !resolved.fullAccessWorkspaceIds.includes(tx.workspaceId) &&
      tx.userId !== resolved.userId
    ) {
      return { error: "Доступ запрещён" };
    }

    await this.transactionRepo.deleteById(id);
    return { ok: true };
  }
}
