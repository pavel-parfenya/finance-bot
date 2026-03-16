import { validate, parse, deepSnakeToCamelObjKeys } from "@tma.js/init-data-node";
import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import type {
  TransactionFilters,
  TransactionDto,
  TransactionUpdateRequest,
  TransactionsResponse,
} from "@finance-bot/shared";
import { buildPeriodRange } from "@finance-bot/shared";
import type { UserService } from "../services/user-service";
import type { WorkspaceService } from "../services/workspace-service";
import type { TransactionRepository } from "../repositories/transaction-repository";
import type { InvitationRepository } from "../repositories/invitation-repository";

interface MiniAppDeps {
  userService: UserService;
  workspaceService: WorkspaceService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
  bot: Bot;
  botToken: string;
}

async function resolveUser(
  initDataRaw: string,
  deps: MiniAppDeps
): Promise<{ userId: number; workspaceIds: number[] } | { error: string }> {
  if (!initDataRaw?.trim()) {
    return { error: "Отсутствуют данные авторизации Telegram" };
  }
  try {
    validate(initDataRaw, deps.botToken);
  } catch {
    return { error: "Недействительная сессия. Откройте приложение заново." };
  }
  const parsed = deepSnakeToCamelObjKeys(parse(initDataRaw)) as {
    user?: { id: number };
  };
  const telegramId = parsed?.user?.id;
  if (!telegramId) return { error: "Пользователь не найден в данных Telegram" };
  const user = await deps.userService.findOneByTelegramId(telegramId);
  if (!user) {
    return { error: "Пользователь не зарегистрирован. Добавьте расходы в боте." };
  }
  const workspaceIds = await deps.workspaceService.getWorkspaceIdsForUser(user.id);
  return { userId: user.id, workspaceIds };
}

export function createMiniAppApi(deps: MiniAppDeps) {
  const { transactionRepo } = deps;

  const DEFAULT_PAGE_SIZE = 20;

  async function handleTransactions(
    initDataRaw: string,
    filters?: TransactionFilters
  ): Promise<TransactionsResponse | { error: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const limit = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, 100);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const pagination = { limit: limit + 1, offset };

    const toDto = (
      t: Awaited<ReturnType<typeof transactionRepo.findByWorkspaceIds>>[number]
    ) => ({
      id: t.id,
      date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
      description: t.description,
      category: t.category,
      amount: String(t.amount),
      currency: t.currency,
    });

    let rows: Awaited<ReturnType<typeof transactionRepo.findByWorkspaceIds>>;
    if (filters?.period && filters.period !== "all") {
      const { start, end } = buildPeriodRange(
        filters.period,
        filters.startDate,
        filters.endDate
      );
      rows = await transactionRepo.findByWorkspaceIdsForPeriod(
        resolved.workspaceIds,
        start,
        end,
        {
          category: filters.category,
          currency: filters.currency,
          userId: filters.userId,
          search: filters.search,
        },
        pagination
      );
    } else {
      if (filters?.category || filters?.currency || filters?.userId || filters?.search) {
        const farPast = new Date(0);
        const farFuture = new Date(8640000000000000);
        rows = await transactionRepo.findByWorkspaceIdsForPeriod(
          resolved.workspaceIds,
          farPast,
          farFuture,
          {
            category: filters.category,
            currency: filters.currency,
            userId: filters.userId,
            search: filters.search,
          },
          pagination
        );
      } else {
        rows = await transactionRepo.findByWorkspaceIdsPaginated(
          resolved.workspaceIds,
          pagination
        );
      }
    }

    const hasMore = rows.length > limit;
    const transactions = rows.slice(0, limit).map(toDto);
    return { transactions, hasMore };
  }

  const EXCHANGE_API = "https://open.er-api.com/v6/latest/USD";

  async function fetchExchangeRates(): Promise<Record<string, number>> {
    const res = await fetch(EXCHANGE_API);
    if (!res.ok) throw new Error("Ошибка загрузки курсов");
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rates = data.rates ?? {};
    rates["USD"] = 1;
    return rates;
  }

  async function handleAnalytics(
    initDataRaw: string,
    periodType: string,
    startDateParam?: string,
    endDateParam?: string
  ): Promise<{
    byCategory?: Array<{ category: string; amount: string }>;
    byCurrency?: Array<{ currency: string; amount: string }>;
    totalInDefault?: string;
    defaultCurrency?: string;
    periodLabel?: string;
    error?: string;
  }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const defaultCurrency =
      (await deps.userService.getDefaultCurrency(resolved.userId)) || "USD";

    const { start, end, periodLabel } = buildPeriodRange(
      periodType,
      startDateParam,
      endDateParam
    );

    const transactions = await transactionRepo.findByWorkspaceIdsForPeriod(
      resolved.workspaceIds,
      start,
      end
    );

    let rates: Record<string, number> = {};
    try {
      rates = await fetchExchangeRates();
    } catch {
      rates["USD"] = 1;
    }

    const byCurrencyMap = new Map<string, number>();
    const byCategoryMap = new Map<string, number>();
    const defRate = rates[defaultCurrency] ?? 1;

    for (const t of transactions) {
      const amt = Number(t.amount);
      const cur = t.currency || "USD";
      const r = rates[cur] ?? 1;
      const amtInDefault = (amt / r) * defRate;

      byCurrencyMap.set(cur, (byCurrencyMap.get(cur) || 0) + amt);
      const key = t.category || "Без категории";
      byCategoryMap.set(key, (byCategoryMap.get(key) || 0) + amtInDefault);
    }

    let totalInDefault = 0;
    for (const [, sum] of byCategoryMap) {
      totalInDefault += sum;
    }

    const byCurrency = Array.from(byCurrencyMap.entries())
      .map(([currency, amount]) => ({ currency, amount: String(amount.toFixed(2)) }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    const byCategory = Array.from(byCategoryMap.entries())
      .map(([category, amount]) => ({ category, amount: String(amount.toFixed(2)) }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    return {
      byCategory,
      byCurrency,
      totalInDefault: totalInDefault.toFixed(2),
      defaultCurrency,
      periodLabel,
    };
  }

  async function handleInvite(
    initDataRaw: string,
    username: string
  ): Promise<{ ok?: boolean; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const workspace = await deps.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { error: "Workspace не найден" };

    const isOwner = await deps.workspaceService.isWorkspaceOwner(
      resolved.userId,
      workspace.id
    );
    if (!isOwner) return { error: "Только владелец может приглашать участников" };

    const uname = username.replace(/^@/, "").trim();
    if (!uname) return { error: "Укажите @username" };

    const invitee = await deps.userService.findByUsername(uname);
    if (!invitee) {
      return {
        error: `Пользователь @${uname} не найден. Он должен сначала написать боту /start.`,
      };
    }

    const existingInTarget = await deps.workspaceService.getWorkspaceIdsForUser(
      invitee.id
    );
    if (existingInTarget.includes(workspace.id)) {
      return { error: "Этот пользователь уже в вашем workspace." };
    }

    try {
      const inv = await deps.invitationRepo.create(
        workspace.id,
        resolved.userId,
        invitee.id
      );
      const invLoaded = await deps.invitationRepo.findById(inv.id);
      const inviterName = invLoaded?.inviter?.username
        ? `@${invLoaded.inviter.username}`
        : "Владелец workspace";

      const kb = new InlineKeyboard()
        .text("Принять", `invite_accept:${inv.id}`)
        .text("Отклонить", `invite_decline:${inv.id}`);

      await deps.bot.api.sendMessage(
        Number(invitee.telegramId),
        `${inviterName} приглашает вас в общий учёт расходов.\n\nПринять приглашение?`,
        { reply_markup: kb }
      );
      return { ok: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Не удалось пригласить" };
    }
  }

  async function handleWorkspaceInfo(initDataRaw: string): Promise<{
    isOwner?: boolean;
    members?: Array<{ userId: number; username: string | null; role: string }>;
    error?: string;
  }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const workspace = await deps.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { isOwner: false };
    const isOwner = await deps.workspaceService.isWorkspaceOwner(
      resolved.userId,
      workspace.id
    );
    const members = await deps.workspaceService.getWorkspaceMembers(workspace.id);
    return { isOwner, members };
  }

  async function handleGetUserSettings(
    initDataRaw: string
  ): Promise<{ defaultCurrency?: string | null; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const defaultCurrency = await deps.userService.getDefaultCurrency(resolved.userId);
    return { defaultCurrency };
  }

  async function handleSetDefaultCurrency(
    initDataRaw: string,
    currency: string
  ): Promise<{ ok?: boolean; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    await deps.userService.setDefaultCurrency(resolved.userId, currency?.trim() || null);
    return { ok: true };
  }

  async function handleUpdateTransaction(
    initDataRaw: string,
    transactionIdStr: string,
    updates: TransactionUpdateRequest
  ): Promise<{ transaction?: TransactionDto; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const id = parseInt(transactionIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID транзакции" };

    const tx = await transactionRepo.findByIdAndWorkspaceIds(id, resolved.workspaceIds);
    if (!tx) return { error: "Транзакция не найдена или доступ запрещён" };

    const toUpdate: {
      description?: string;
      category?: string;
      amount?: number;
      currency?: string;
      date?: Date;
    } = {};
    if (updates.description !== undefined) toUpdate.description = updates.description;
    if (updates.category !== undefined) toUpdate.category = updates.category;
    if (updates.amount !== undefined) {
      const amt = Number(updates.amount);
      if (isNaN(amt) || amt < 0) return { error: "Некорректная сумма" };
      toUpdate.amount = amt;
    }
    if (updates.currency !== undefined) toUpdate.currency = updates.currency;
    if (updates.date !== undefined) {
      const d = new Date(updates.date);
      if (isNaN(d.getTime())) return { error: "Некорректная дата" };
      toUpdate.date = d;
    }

    const updated = await transactionRepo.update(id, toUpdate);
    if (!updated) return { error: "Ошибка обновления" };

    return {
      transaction: {
        id: updated.id,
        date:
          updated.date instanceof Date
            ? updated.date.toISOString()
            : String(updated.date),
        description: updated.description,
        category: updated.category,
        amount: String(updated.amount),
        currency: updated.currency,
      },
    };
  }

  async function handleDeleteTransaction(
    initDataRaw: string,
    transactionIdStr: string
  ): Promise<{ ok?: boolean; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const id = parseInt(transactionIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID транзакции" };

    const tx = await transactionRepo.findByIdAndWorkspaceIds(id, resolved.workspaceIds);
    if (!tx) return { error: "Транзакция не найдена или доступ запрещён" };

    await transactionRepo.deleteById(id);
    return { ok: true };
  }

  async function handleTransactionsCategories(
    initDataRaw: string
  ): Promise<{ categories?: string[]; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const categories = await transactionRepo.getUniqueCategories(resolved.workspaceIds);
    return { categories };
  }

  return {
    handleTransactions,
    handleTransactionsCategories,
    handleAnalytics,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleInvite,
    handleWorkspaceInfo,
    handleGetUserSettings,
    handleSetDefaultCurrency,
  };
}
