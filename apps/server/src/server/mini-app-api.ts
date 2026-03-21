import { validate, parse, deepSnakeToCamelObjKeys } from "@tma.js/init-data-node";
import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import { DebtStatus } from "../database/entities";
import type {
  TransactionFilters,
  TransactionDto,
  TransactionUpdateRequest,
  TransactionsResponse,
  DebtDto,
  DebtCreateRequest,
  DebtUpdateRequest,
} from "@finance-bot/shared";
import { buildPeriodRange } from "@finance-bot/shared";
import { aggregateByCategoryAndCurrency } from "../analytics/aggregate-transactions";
import type { UserService } from "../services/user-service";
import type { WorkspaceService } from "../services/workspace-service";
import type { TransactionRepository } from "../repositories/transaction-repository";
import type { InvitationRepository } from "../repositories/invitation-repository";
import type { DebtRepository } from "../repositories/debt-repository";

interface MiniAppDeps {
  userService: UserService;
  workspaceService: WorkspaceService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
  debtRepo: DebtRepository;
  bot: Bot;
  botToken: string;
}

async function resolveUser(
  initDataRaw: string,
  deps: MiniAppDeps
): Promise<
  | {
      userId: number;
      workspaceIds: number[];
      creatorDisplayName: string;
      fullAccessWorkspaceIds: number[];
    }
  | { error: string }
> {
  if (!initDataRaw?.trim()) {
    return { error: "Отсутствуют данные авторизации Telegram" };
  }
  try {
    validate(initDataRaw, deps.botToken);
  } catch {
    return { error: "Недействительная сессия. Откройте приложение заново." };
  }
  const parsed = deepSnakeToCamelObjKeys(parse(initDataRaw)) as {
    user?: { id: number; firstName?: string; username?: string };
  };
  const telegramId = parsed?.user?.id;
  if (!telegramId) return { error: "Пользователь не найден в данных Telegram" };
  const user = await deps.userService.findOneByTelegramId(telegramId);
  if (!user) {
    return { error: "Пользователь не зарегистрирован. Добавьте расходы в боте." };
  }
  const workspaceIds = await deps.workspaceService.getWorkspaceIdsForUser(user.id);
  const fullAccessWorkspaceIds: number[] = [];
  for (const wid of workspaceIds) {
    const hasAccess = await deps.workspaceService.getMemberFullAccess(wid, user.id);
    if (hasAccess) fullAccessWorkspaceIds.push(wid);
  }
  const creatorDisplayName =
    parsed?.user?.firstName ||
    (parsed?.user?.username ? `@${parsed.user.username}` : "Пользователь");
  return {
    userId: user.id,
    workspaceIds,
    creatorDisplayName,
    fullAccessWorkspaceIds,
  };
}

function buildAccess(
  workspaceIds: number[],
  fullAccessWorkspaceIds: number[],
  userId: number
): { fullAccessWorkspaceIds: number[]; restrictToUserId: number } | undefined {
  if (fullAccessWorkspaceIds.length >= workspaceIds.length) return undefined;
  return { fullAccessWorkspaceIds, restrictToUserId: userId };
}

export function createMiniAppApi(deps: MiniAppDeps) {
  const { transactionRepo, debtRepo } = deps;

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

    const access = buildAccess(
      resolved.workspaceIds,
      resolved.fullAccessWorkspaceIds,
      resolved.userId
    );

    const toDto = (
      t: Awaited<ReturnType<typeof transactionRepo.findByWorkspaceIds>>[number]
    ) => {
      const datePart =
        t.date instanceof Date
          ? t.date.toISOString().slice(0, 10)
          : String(t.date).slice(0, 10);
      const isoUtc = `${datePart}T${t.time}:00.000Z`;
      return {
        id: t.id,
        date: isoUtc,
        description: t.description,
        category: t.category,
        amount: String(t.amount),
        currency: t.currency,
        personDisplayName:
          (t as { personDisplayName?: string }).personDisplayName ?? undefined,
      };
    };

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
        pagination,
        access
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
          pagination,
          access
        );
      } else {
        rows = await transactionRepo.findByWorkspaceIdsPaginated(
          resolved.workspaceIds,
          pagination,
          access
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
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const defaultCurrency =
      (await deps.userService.getDefaultCurrency(resolved.userId)) || "USD";

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

    const transactions = await transactionRepo.findByWorkspaceIdsForPeriod(
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
    userId?: number;
    isOwner?: boolean;
    members?: Array<{
      userId: number;
      username: string | null;
      role: string;
      fullAccess: boolean;
    }>;
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
    return { userId: resolved.userId, isOwner, members };
  }

  async function handleSetMemberFullAccess(
    initDataRaw: string,
    targetUserId: number,
    fullAccess: boolean
  ): Promise<{ ok?: boolean; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const workspace = await deps.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { error: "Workspace не найден" };

    const result = await deps.workspaceService.setMemberFullAccess(
      workspace.id,
      resolved.userId,
      targetUserId,
      fullAccess
    );
    if (!result.ok) return { error: result.error };
    return { ok: true };
  }

  async function handleGetUserSettings(initDataRaw: string): Promise<{
    defaultCurrency?: string | null;
    analyticsEnabled?: boolean;
    analyticsVoice?: string;
    error?: string;
  }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const [defaultCurrency, analyticsEnabled, analyticsVoice] = await Promise.all([
      deps.userService.getDefaultCurrency(resolved.userId),
      deps.userService.getAnalyticsEnabled(resolved.userId),
      deps.userService.getAnalyticsVoice(resolved.userId),
    ]);

    return {
      defaultCurrency: defaultCurrency ?? null,
      analyticsEnabled,
      analyticsVoice: analyticsVoice ?? "official",
    };
  }

  async function handleUpdateUserSettings(
    initDataRaw: string,
    updates: {
      defaultCurrency?: string | null;
      analyticsEnabled?: boolean;
      analyticsVoice?: string;
    }
  ): Promise<{ ok?: boolean; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    await deps.userService.updateUserSettings(resolved.userId, updates);
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

    const datePart =
      updated.date instanceof Date
        ? updated.date.toISOString().slice(0, 10)
        : String(updated.date).slice(0, 10);
    const isoUtc = `${datePart}T${updated.time}:00.000Z`;
    const txWithPerson = updated as { personDisplayName?: string };
    return {
      transaction: {
        id: updated.id,
        date: isoUtc,
        description: updated.description,
        category: updated.category,
        amount: String(updated.amount),
        currency: updated.currency,
        personDisplayName: txWithPerson.personDisplayName ?? undefined,
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
    if (
      !resolved.fullAccessWorkspaceIds.includes(tx.workspaceId) &&
      tx.userId !== resolved.userId
    ) {
      return { error: "Доступ запрещён" };
    }

    await transactionRepo.deleteById(id);
    return { ok: true };
  }

  async function handleTransactionsCategories(
    initDataRaw: string
  ): Promise<{ categories?: string[]; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const access = buildAccess(
      resolved.workspaceIds,
      resolved.fullAccessWorkspaceIds,
      resolved.userId
    );
    const categories = await transactionRepo.getUniqueCategories(
      resolved.workspaceIds,
      access
    );
    return { categories };
  }

  function toDebtDto(
    d: Awaited<ReturnType<DebtRepository["findById"]>>,
    userId: number
  ): DebtDto | null {
    if (!d) return null;
    const isCreditor = d.creditorUserId === userId;
    const debtWithRelations = d as {
      debtor?: { username?: string | null } | null;
      creditor?: { username?: string | null } | null;
    };
    return {
      id: d.id,
      debtorName: d.debtorName,
      creditorName: d.creditorName,
      debtorUserId: d.debtorUserId,
      creditorUserId: d.creditorUserId,
      debtorUsername: debtWithRelations.debtor?.username ?? null,
      creditorUsername: debtWithRelations.creditor?.username ?? null,
      amount: Number(d.amount),
      currency: d.currency,
      lentDate: d.lentDate
        ? d.lentDate instanceof Date
          ? d.lentDate.toISOString().slice(0, 10)
          : String(d.lentDate).slice(0, 10)
        : null,
      deadline: d.deadline
        ? d.deadline instanceof Date
          ? d.deadline.toISOString().slice(0, 10)
          : String(d.deadline).slice(0, 10)
        : null,
      repaidAmount: Number(d.repaidAmount),
      status: d.status as "pending" | "active",
      isMain: d.mainUserId === userId,
      isCreditor,
      createdAt:
        d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    };
  }

  async function handleDebts(
    initDataRaw: string
  ): Promise<{ debts?: DebtDto[]; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const debts = await debtRepo.findByUserId(resolved.userId);
    return {
      debts: debts.map((d) => toDebtDto(d, resolved.userId)!).filter(Boolean),
    };
  }

  async function resolveUsernameToUser(
    username: string | null | undefined
  ): Promise<{ userId: number; telegramId: number } | { error: string } | null> {
    if (!username || !username.trim()) return null;
    const uname = username.replace(/^@/, "").trim().toLowerCase();
    if (!uname) return null;
    const user = await deps.userService.findByUsername(uname);
    if (!user)
      return {
        error: `Пользователь @${uname} не найден. Он должен написать боту /start.`,
      };
    return { userId: user.id, telegramId: Number(user.telegramId) };
  }

  async function handleCreateDebt(
    initDataRaw: string,
    body: DebtCreateRequest
  ): Promise<{ debt?: DebtDto; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const creatorUserId = resolved.userId;
    const creatorDisplayName = resolved.creatorDisplayName;
    let debtorUserId: number | null = null;
    let creditorUserId: number | null = null;
    let mainUserId: number;
    let linkedUserTelegramId: number | undefined;

    if (body.iAmCreditor) {
      creditorUserId = creatorUserId;
      const resolvedDebtor = await resolveUsernameToUser(body.debtorUsername);
      if (resolvedDebtor !== null) {
        if ("error" in resolvedDebtor) return { error: resolvedDebtor.error };
        if (resolvedDebtor.userId === creatorUserId)
          return { error: "Нельзя привязать себя как должника" };
        debtorUserId = resolvedDebtor.userId;
        linkedUserTelegramId = resolvedDebtor.telegramId;
      }
      mainUserId = creatorUserId;
    } else {
      debtorUserId = creatorUserId;
      const resolvedCreditor = await resolveUsernameToUser(body.creditorUsername);
      if (resolvedCreditor !== null) {
        if ("error" in resolvedCreditor) return { error: resolvedCreditor.error };
        if (resolvedCreditor.userId === creatorUserId)
          return { error: "Нельзя привязать себя как кредитора" };
        creditorUserId = resolvedCreditor.userId;
        linkedUserTelegramId = resolvedCreditor.telegramId;
      }
      mainUserId = creatorUserId;
    }

    const status =
      debtorUserId || creditorUserId ? DebtStatus.Pending : DebtStatus.Active;

    const debt = await debtRepo.create({
      creatorUserId,
      debtorUserId,
      creditorUserId,
      debtorName: body.debtorName,
      creditorName: body.creditorName,
      amount: body.amount,
      currency: body.currency,
      lentDate: body.lentDate ? new Date(body.lentDate) : null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      repaidAmount: body.repaidAmount ?? 0,
      mainUserId,
      status,
    });

    if (linkedUserTelegramId && debt.status === DebtStatus.Pending) {
      const debtorName = body.debtorName || body.creditorName || "—";
      const debtDesc = `${debtorName} — ${body.amount} ${body.currency}`;
      const msg = `${creatorDisplayName} создал(а) запись о долге: ${debtDesc}. Подтвердите или отклоните.`;
      const kb = new InlineKeyboard()
        .text("Подтвердить", `debt_confirm:${debt.id}`)
        .text("Отклонить", `debt_reject:${debt.id}`);
      try {
        await deps.bot.api.sendMessage(linkedUserTelegramId, msg, { reply_markup: kb });
      } catch (err) {
        console.error("Failed to send debt notification:", err);
      }
    }

    return { debt: toDebtDto(debt, resolved.userId)! };
  }

  async function handleUpdateDebt(
    initDataRaw: string,
    debtIdStr: string,
    updates: DebtUpdateRequest
  ): Promise<{ debt?: DebtDto; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const id = parseInt(debtIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID" };

    const debt = await debtRepo.findById(id);
    if (!debt) return { error: "Долг не найден" };
    if (debt.mainUserId !== resolved.userId)
      return { error: "Нет прав на редактирование" };

    const toUpdate: Parameters<DebtRepository["update"]>[1] = {};
    if (updates.debtorName !== undefined) toUpdate.debtorName = updates.debtorName;
    if (updates.creditorName !== undefined) toUpdate.creditorName = updates.creditorName;

    let linkedUserTelegramIdForNotify: number | undefined;

    if (updates.debtorUsername !== undefined) {
      const resolvedDebtor = await resolveUsernameToUser(updates.debtorUsername);
      if (resolvedDebtor !== null) {
        if ("error" in resolvedDebtor) return { error: resolvedDebtor.error };
        if (resolvedDebtor.userId === resolved.userId)
          return { error: "Нельзя привязать себя как должника" };
        toUpdate.debtorUserId = resolvedDebtor.userId;
        const isNewLink = debt.debtorUserId !== resolvedDebtor.userId;
        if (isNewLink) {
          toUpdate.status = DebtStatus.Pending;
          linkedUserTelegramIdForNotify = resolvedDebtor.telegramId;
        }
      } else {
        toUpdate.debtorUserId = null;
        toUpdate.status = DebtStatus.Active;
      }
    }
    if (updates.creditorUsername !== undefined) {
      const resolvedCreditor = await resolveUsernameToUser(updates.creditorUsername);
      if (resolvedCreditor !== null) {
        if ("error" in resolvedCreditor) return { error: resolvedCreditor.error };
        if (resolvedCreditor.userId === resolved.userId)
          return { error: "Нельзя привязать себя как кредитора" };
        toUpdate.creditorUserId = resolvedCreditor.userId;
        const isNewLink = debt.creditorUserId !== resolvedCreditor.userId;
        if (isNewLink) {
          toUpdate.status = DebtStatus.Pending;
          linkedUserTelegramIdForNotify = resolvedCreditor.telegramId;
          toUpdate.mainUserId = resolved.userId;
        }
      } else {
        toUpdate.creditorUserId = null;
        toUpdate.mainUserId = resolved.userId;
        toUpdate.status = DebtStatus.Active;
      }
    }
    if (updates.amount !== undefined) toUpdate.amount = updates.amount;
    if (updates.currency !== undefined) toUpdate.currency = updates.currency;
    if (updates.lentDate !== undefined)
      toUpdate.lentDate = updates.lentDate ? new Date(updates.lentDate) : null;
    if (updates.deadline !== undefined)
      toUpdate.deadline = updates.deadline ? new Date(updates.deadline) : null;
    if (updates.repaidAmount !== undefined) toUpdate.repaidAmount = updates.repaidAmount;

    const updated = await debtRepo.update(id, toUpdate);

    const debtWithRelations = debt as {
      debtor?: { telegramId: number } | null;
      creditor?: { telegramId: number } | null;
    };

    if (linkedUserTelegramIdForNotify && updated?.status === DebtStatus.Pending) {
      const creatorDisplayName = resolved.creatorDisplayName;
      const debtorName = updates.debtorName ?? debt.debtorName;
      const creditorName = updates.creditorName ?? debt.creditorName;
      const amount = updates.amount ?? Number(debt.amount);
      const currency = updates.currency ?? debt.currency;
      const debtDesc = `${debtorName || creditorName || "—"} — ${amount} ${currency}`;
      const msg = `${creatorDisplayName} привязал(а) вас к долгу: ${debtDesc}. Подтвердите или отклоните.`;
      const kb = new InlineKeyboard()
        .text("Подтвердить", `debt_confirm:${id}`)
        .text("Отклонить", `debt_reject:${id}`);
      try {
        await deps.bot.api.sendMessage(linkedUserTelegramIdForNotify, msg, {
          reply_markup: kb,
        });
      } catch (err) {
        console.error("Failed to send debt notification:", err);
      }
    } else {
      const changes: string[] = [];
      const amountChanged =
        updates.amount !== undefined && Number(debt.amount) !== updates.amount;
      const currencyChanged =
        updates.currency !== undefined && debt.currency !== updates.currency;
      if (amountChanged && currencyChanged) {
        changes.push(
          `Сумма: ${debt.amount} ${debt.currency} → ${updates.amount} ${updates.currency}`
        );
      } else if (amountChanged) {
        changes.push(`Сумма: ${debt.amount} → ${updates.amount} ${debt.currency}`);
      } else if (currencyChanged) {
        changes.push(`Валюта: ${debt.currency} → ${updates.currency}`);
      }
      if (updates.deadline !== undefined) {
        const oldD = debt.deadline
          ? debt.deadline instanceof Date
            ? debt.deadline.toISOString().slice(0, 10)
            : String(debt.deadline).slice(0, 10)
          : "—";
        const newD = updates.deadline || "—";
        if (oldD !== newD) changes.push(`Дедлайн: ${oldD} → ${newD}`);
      }
      if (
        updates.repaidAmount !== undefined &&
        Number(debt.repaidAmount) !== updates.repaidAmount
      ) {
        changes.push(`Возвращено: ${debt.repaidAmount} → ${updates.repaidAmount}`);
      }
      if (updates.debtorName !== undefined && debt.debtorName !== updates.debtorName) {
        changes.push(`Имя должника: ${debt.debtorName} → ${updates.debtorName}`);
      }
      if (
        updates.creditorName !== undefined &&
        debt.creditorName !== updates.creditorName
      ) {
        changes.push(`Имя кредитора: ${debt.creditorName} → ${updates.creditorName}`);
      }

      if (changes.length > 0) {
        let counterpartyTelegramId: number | undefined;
        let isDebtorCounterparty = false;
        if (
          debt.debtorUserId &&
          debt.debtorUserId !== resolved.userId &&
          debtWithRelations.debtor
        ) {
          counterpartyTelegramId = Number(debtWithRelations.debtor.telegramId);
          isDebtorCounterparty = true;
        } else if (
          debt.creditorUserId &&
          debt.creditorUserId !== resolved.userId &&
          debtWithRelations.creditor
        ) {
          counterpartyTelegramId = Number(debtWithRelations.creditor.telegramId);
        }

        if (counterpartyTelegramId && !isNaN(counterpartyTelegramId)) {
          const creatorDisplayName = resolved.creatorDisplayName;
          const msg = `${creatorDisplayName} изменил(а) долг:\n${changes.join("\n")}`;
          const repaidDelta =
            updates.repaidAmount !== undefined &&
            isDebtorCounterparty &&
            Number(updates.repaidAmount) > Number(debt.repaidAmount)
              ? Number(updates.repaidAmount) - Number(debt.repaidAmount)
              : 0;
          const addRepaidButtons = repaidDelta > 0;
          let replyMarkup:
            | { reply_markup: InstanceType<typeof InlineKeyboard> }
            | undefined;
          if (addRepaidButtons) {
            const kb = new InlineKeyboard()
              .text("Занести в расходы", `debt_repaid_add:${id}:${repaidDelta}`)
              .text("Не заносить", `debt_repaid_skip:${id}`);
            replyMarkup = { reply_markup: kb };
          }
          try {
            await deps.bot.api.sendMessage(
              counterpartyTelegramId,
              msg,
              replyMarkup ?? {}
            );
          } catch (err) {
            console.error("Failed to send debt update notification:", err);
          }
        }
      }
    }

    return { debt: toDebtDto(updated!, resolved.userId)! };
  }

  async function handleDeleteDebt(
    initDataRaw: string,
    debtIdStr: string
  ): Promise<{ ok?: boolean; error?: string }> {
    const resolved = await resolveUser(initDataRaw, deps);
    if ("error" in resolved) return { error: resolved.error };

    const id = parseInt(debtIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID" };

    const debt = await debtRepo.findById(id);
    if (!debt) return { error: "Долг не найден" };
    if (debt.mainUserId !== resolved.userId) return { error: "Нет прав на удаление" };

    const debtWithRelations = debt as {
      debtor?: { telegramId: number } | null;
      creditor?: { telegramId: number } | null;
    };
    let counterpartyTelegramId: number | undefined;
    if (
      debt.debtorUserId &&
      debt.debtorUserId !== resolved.userId &&
      debtWithRelations.debtor
    ) {
      counterpartyTelegramId = Number(debtWithRelations.debtor.telegramId);
    } else if (
      debt.creditorUserId &&
      debt.creditorUserId !== resolved.userId &&
      debtWithRelations.creditor
    ) {
      counterpartyTelegramId = Number(debtWithRelations.creditor.telegramId);
    }

    if (counterpartyTelegramId && !isNaN(counterpartyTelegramId)) {
      const creatorDisplayName = resolved.creatorDisplayName;
      const debtDesc = `${debt.debtorName} — ${debt.amount} ${debt.currency}`;
      const msg = `${creatorDisplayName} удалил(а) запись о долге: ${debtDesc}.`;
      try {
        await deps.bot.api.sendMessage(counterpartyTelegramId, msg);
      } catch (err) {
        console.error("Failed to send debt delete notification:", err);
      }
    }

    await debtRepo.delete(id);
    return { ok: true };
  }

  return {
    handleTransactions,
    handleTransactionsCategories,
    handleAnalytics,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDebts,
    handleCreateDebt,
    handleUpdateDebt,
    handleDeleteDebt,
    handleInvite,
    handleWorkspaceInfo,
    handleSetMemberFullAccess,
    handleGetUserSettings,
    handleUpdateUserSettings,
  };
}
