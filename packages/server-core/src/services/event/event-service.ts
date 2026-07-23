import type {
  EventDto,
  EventDetailDto,
  EventMemberDto,
  EventTransactionDto,
  EventSettlementRow,
  EventCreateRequest,
  EventUpdateRequest,
} from "@finance-bot/shared-types";
import {
  Event,
  EventStatus,
  EventMember,
  EventMemberRole,
  Transaction,
  DebtStatus,
  InvitationStatus,
} from "../../database/entities";
import { fetchExchangeRates } from "../../analytics/fetch-exchange-rates";
import {
  computeSettlement,
  convertAmount,
  type SettlementParticipant,
} from "./event-service.utils";
import type {
  EventServiceDeps,
  EventInviteResult,
  EventInviteResponseResult,
  EventDebtResult,
} from "./event-service.types";

export type EventErrorCode = "not_found" | "forbidden" | "bad_request" | "gated";

/** Ошибка бизнес-логики событий; API-слой маппит `code` в HTTP-статус. */
export class EventError extends Error {
  constructor(
    message: string,
    public readonly code: EventErrorCode = "bad_request"
  ) {
    super(message);
    this.name = "EventError";
  }
}

function displayNameFor(
  username: string | null | undefined,
  fallback: string | number
): string {
  if (username) return `@${username}`;
  return typeof fallback === "string" && fallback ? fallback : `#${fallback}`;
}

export class EventService {
  private readonly deps: EventServiceDeps;
  private readonly fetchRates: () => Promise<Record<string, number>>;

  constructor(deps: EventServiceDeps) {
    this.deps = deps;
    this.fetchRates = deps.fetchRates ?? fetchExchangeRates;
  }

  // --- Создание / список / детали ---------------------------------------

  async create(userId: number, body: EventCreateRequest): Promise<EventDto> {
    if (!(await this.deps.featureService.hasFeature(userId, "events"))) {
      throw new EventError(
        "Создание событий доступно на тарифе PRO. Оформите подписку в разделе «Подписка».",
        "gated"
      );
    }
    const name = (body.name ?? "").trim();
    if (!name) throw new EventError("Название события не может быть пустым");

    const currency =
      body.currency?.trim() ||
      (await this.deps.userService.getDefaultCurrency(userId)) ||
      "USD";

    const event = await this.deps.eventRepo.create({
      name,
      description: (body.description ?? "").trim(),
      keywords: (body.keywords ?? "").trim(),
      creatorUserId: userId,
      currency,
    });
    await this.deps.eventRepo.addMember(event.id, userId, EventMemberRole.Owner);

    return this.mapEventDto(event, 1, 0, userId);
  }

  async getEventsForUser(userId: number): Promise<EventDto[]> {
    const events = await this.deps.eventRepo.findEventsForUser(userId);
    if (events.length === 0) return [];

    let rates: Record<string, number> | null = null;
    const result: EventDto[] = [];
    for (const event of events) {
      const txs = await this.deps.transactionRepo.findByEventId(event.id);
      const myTxs = txs.filter((t) => t.userId === userId && !t.excludedFromEvent);
      if (!rates && myTxs.some((t) => t.currency !== event.currency)) {
        rates = await this.loadRatesSafe();
      }
      const myTotal = myTxs.reduce(
        (s, t) =>
          s + convertAmount(Number(t.amount), t.currency, event.currency, rates ?? {}),
        0
      );
      const memberCount = await this.deps.eventRepo.countMembers(event.id);
      result.push(this.mapEventDto(event, memberCount, round2(myTotal), userId));
    }
    return result;
  }

  async getEventDetail(eventId: number, userId: number): Promise<EventDetailDto> {
    const { event } = await this.requireMembership(eventId, userId);
    const members = await this.deps.eventRepo.findMembers(eventId);
    const allTx = await this.deps.transactionRepo.findByEventId(eventId);

    const needsRates = allTx.some((t) => t.currency !== event.currency);
    const rates = needsRates ? await this.loadRatesSafe() : {};

    // Учитываемые суммы по участникам (в валюте события).
    const totals = new Map<number, number>();
    for (const m of members) totals.set(m.userId, 0);
    for (const t of allTx) {
      if (t.excludedFromEvent) continue;
      const inEvent = convertAmount(Number(t.amount), t.currency, event.currency, rates);
      totals.set(t.userId, (totals.get(t.userId) ?? 0) + inEvent);
    }

    const mapTx = (t: Transaction): EventTransactionDto => ({
      id: t.id,
      description: t.description,
      category: t.category,
      amount: Number(t.amount),
      currency: t.currency,
      occurredAt: t.occurredAt.toISOString(),
      excludedFromEvent: t.excludedFromEvent,
      userId: t.userId,
      username: t.user?.username ?? null,
      displayName: t.personDisplayName || displayNameFor(t.user?.username, t.userId),
      isMine: t.userId === userId,
      amountInEventCurrency: round2(
        convertAmount(Number(t.amount), t.currency, event.currency, rates)
      ),
    });

    const membersDto: EventMemberDto[] = members.map((m) =>
      this.mapMember(m, event, userId, round2(totals.get(m.userId) ?? 0))
    );

    const base = this.mapEventDto(
      event,
      members.length,
      round2(totals.get(userId) ?? 0),
      userId
    );

    // Помечаем строки расчёта, по которым долг уже создан (для блокировки кнопки).
    let settlement = event.settlement ?? null;
    if (settlement && settlement.length > 0) {
      const eventDebts = await this.deps.debtRepo.findByEventId(eventId);
      settlement = settlement.map((r) => ({
        ...r,
        debtCreated: eventDebts.some(
          (d) => d.debtorUserId === r.fromUserId && d.creditorUserId === r.toUserId
        ),
      }));
    }

    return {
      ...base,
      creatorUserId: event.creatorUserId,
      members: membersDto,
      myTransactions: allTx.filter((t) => t.userId === userId).map(mapTx),
      allTransactions: allTx.map(mapTx),
      settlement,
    };
  }

  // --- Редактирование / удаление ----------------------------------------

  async updateInfo(
    eventId: number,
    userId: number,
    patch: EventUpdateRequest
  ): Promise<EventDetailDto> {
    const { event } = await this.requireMembership(eventId, userId);
    const updates: EventUpdateRequest = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new EventError("Название события не может быть пустым");
      updates.name = name;
    }
    if (patch.description !== undefined) updates.description = patch.description.trim();
    if (patch.keywords !== undefined) updates.keywords = patch.keywords.trim();
    await this.deps.eventRepo.updateInfo(event.id, updates);
    return this.getEventDetail(eventId, userId);
  }

  async deleteEvent(eventId: number, userId: number): Promise<void> {
    const event = await this.deps.eventRepo.findById(eventId);
    if (!event) throw new EventError("Событие не найдено", "not_found");
    if (event.creatorUserId !== userId) {
      throw new EventError("Удалить событие может только создатель", "forbidden");
    }
    // Траты остаются личными — только отвязываем от события.
    await this.deps.transactionRepo.clearEventAll(eventId);
    await this.deps.eventRepo.delete(eventId);
  }

  // --- Участники / приглашения ------------------------------------------

  async invite(
    eventId: number,
    userId: number,
    username: string
  ): Promise<EventInviteResult> {
    const { event } = await this.requireMembership(eventId, userId);
    if (event.status === EventStatus.Settled) {
      throw new EventError("Событие завершено, приглашения недоступны");
    }
    const uname = username.replace(/^@/, "").trim();
    if (!uname) throw new EventError("Укажите @username");

    const invitee = await this.deps.userService.findByUsername(uname);
    if (!invitee) {
      throw new EventError(
        `Пользователь @${uname} не найден. Он должен сначала написать боту /start.`,
        "not_found"
      );
    }
    if (invitee.id === userId) {
      throw new EventError("Нельзя пригласить самого себя");
    }
    if (await this.deps.eventRepo.findMembership(eventId, invitee.id)) {
      throw new EventError("Этот пользователь уже участник события");
    }
    if (await this.deps.eventRepo.findPendingInvitation(eventId, invitee.id)) {
      throw new EventError("Приглашение уже отправлено");
    }

    const inv = await this.deps.eventRepo.createInvitation(eventId, userId, invitee.id);
    const inviter = await this.deps.userService.findById(userId);
    return {
      invitationId: inv.id,
      inviteeTelegramId: Number(invitee.telegramId),
      inviterName: displayNameFor(inviter?.username, "Участник"),
      eventName: event.name,
    };
  }

  async acceptInvite(
    invitationId: number,
    userId: number
  ): Promise<EventInviteResponseResult> {
    const inv = await this.deps.eventRepo.findInvitationById(invitationId);
    if (!inv) return { ok: false, error: "Приглашение не найдено" };
    if (inv.inviteeId !== userId)
      return { ok: false, error: "Это приглашение не для вас" };
    if (inv.status !== InvitationStatus.Pending)
      return { ok: false, error: "Приглашение уже обработано" };

    await this.deps.eventRepo.addMember(inv.eventId, userId, EventMemberRole.Member);
    await this.deps.eventRepo.updateInvitationStatus(inv.id, InvitationStatus.Accepted);
    return { ok: true, eventId: inv.eventId, eventName: inv.event?.name };
  }

  async declineInvite(
    invitationId: number,
    userId: number
  ): Promise<EventInviteResponseResult> {
    const inv = await this.deps.eventRepo.findInvitationById(invitationId);
    if (!inv) return { ok: false, error: "Приглашение не найдено" };
    if (inv.inviteeId !== userId)
      return { ok: false, error: "Это приглашение не для вас" };
    if (inv.status !== InvitationStatus.Pending)
      return { ok: false, error: "Приглашение уже обработано" };

    await this.deps.eventRepo.updateInvitationStatus(inv.id, InvitationStatus.Declined);
    return { ok: true, eventId: inv.eventId, eventName: inv.event?.name };
  }

  async leaveEvent(eventId: number, userId: number): Promise<void> {
    const event = await this.deps.eventRepo.findById(eventId);
    if (!event) throw new EventError("Событие не найдено", "not_found");
    if (event.creatorUserId === userId) {
      throw new EventError(
        "Создатель не может выйти из события — его можно только удалить",
        "forbidden"
      );
    }
    if (event.status === EventStatus.Settled) {
      throw new EventError("Событие завершено, выход недоступен");
    }
    const membership = await this.deps.eventRepo.findMembership(eventId, userId);
    if (!membership) throw new EventError("Вы не участник события", "forbidden");

    await this.deps.transactionRepo.clearEventForUser(eventId, userId);
    await this.deps.eventRepo.removeMember(eventId, userId);
  }

  async removeMember(
    eventId: number,
    byUserId: number,
    targetUserId: number
  ): Promise<void> {
    const event = await this.deps.eventRepo.findById(eventId);
    if (!event) throw new EventError("Событие не найдено", "not_found");
    if (event.creatorUserId !== byUserId) {
      throw new EventError("Исключать участников может только создатель", "forbidden");
    }
    if (targetUserId === event.creatorUserId) {
      throw new EventError("Нельзя исключить создателя события");
    }
    if (event.status === EventStatus.Settled) {
      throw new EventError("Событие завершено");
    }
    await this.deps.transactionRepo.clearEventForUser(eventId, targetUserId);
    await this.deps.eventRepo.removeMember(eventId, targetUserId);
  }

  // --- Траты события -----------------------------------------------------

  async linkTransaction(eventId: number, userId: number, txId: number): Promise<void> {
    const { event } = await this.requireMembership(eventId, userId);
    if (event.status === EventStatus.Settled) throw new EventError("Событие завершено");
    const tx = await this.deps.transactionRepo.findEventTransactionById(txId);
    if (!tx) throw new EventError("Транзакция не найдена", "not_found");
    if (tx.userId !== userId)
      throw new EventError("Можно привязывать только свои траты", "forbidden");
    await this.deps.transactionRepo.setEventId(txId, eventId);
  }

  async unlinkTransaction(eventId: number, userId: number, txId: number): Promise<void> {
    const { event } = await this.requireMembership(eventId, userId);
    if (event.status === EventStatus.Settled) throw new EventError("Событие завершено");
    const tx = await this.getOwnEventTx(txId, eventId, userId);
    await this.deps.transactionRepo.setEventId(tx.id, null);
    await this.deps.transactionRepo.setExcludedFromEvent(tx.id, false);
  }

  async deleteTransaction(eventId: number, userId: number, txId: number): Promise<void> {
    const { event } = await this.requireMembership(eventId, userId);
    if (event.status === EventStatus.Settled) throw new EventError("Событие завершено");
    const tx = await this.getOwnEventTx(txId, eventId, userId);
    await this.deps.transactionRepo.deleteById(tx.id);
  }

  async setExcluded(
    eventId: number,
    userId: number,
    txId: number,
    excluded: boolean
  ): Promise<void> {
    const { event } = await this.requireMembership(eventId, userId);
    if (event.status === EventStatus.Settled) throw new EventError("Событие завершено");
    const tx = await this.deps.transactionRepo.findEventTransactionById(txId);
    if (!tx || tx.eventId !== eventId)
      throw new EventError("Транзакция не найдена", "not_found");
    const isCreator = event.creatorUserId === userId;
    if (tx.userId !== userId && !isCreator) {
      throw new EventError("Исключить чужую трату может только создатель", "forbidden");
    }
    await this.deps.transactionRepo.setExcludedFromEvent(txId, excluded);
  }

  // --- Расчёт («распил») -------------------------------------------------

  async settle(eventId: number, userId: number): Promise<EventDetailDto> {
    const event = await this.deps.eventRepo.findById(eventId);
    if (!event) throw new EventError("Событие не найдено", "not_found");
    if (event.creatorUserId !== userId) {
      throw new EventError("Завершить и рассчитать может только создатель", "forbidden");
    }
    if (event.status === EventStatus.Settled) {
      throw new EventError("Событие уже рассчитано");
    }

    const members = await this.deps.eventRepo.findMembers(eventId);
    const allTx = await this.deps.transactionRepo.findByEventId(eventId);
    const needsRates = allTx.some((t) => t.currency !== event.currency);
    const rates = needsRates ? await this.loadRatesSafe() : {};

    const paidByUser = new Map<number, number>();
    for (const m of members) paidByUser.set(m.userId, 0);
    for (const t of allTx) {
      if (t.excludedFromEvent) continue;
      const inEvent = convertAmount(Number(t.amount), t.currency, event.currency, rates);
      paidByUser.set(t.userId, (paidByUser.get(t.userId) ?? 0) + inEvent);
    }

    const participants: SettlementParticipant[] = members.map((m) => ({
      userId: m.userId,
      name: displayNameFor(m.user?.username, m.userId),
      paid: paidByUser.get(m.userId) ?? 0,
    }));

    const transfers = computeSettlement(participants);
    const settlement: EventSettlementRow[] = transfers.map((t) => ({
      fromUserId: t.fromUserId,
      fromName: t.fromName,
      toUserId: t.toUserId,
      toName: t.toName,
      amount: t.amount,
      currency: event.currency,
    }));

    await this.deps.eventRepo.saveSettlement(eventId, settlement, new Date());
    return this.getEventDetail(eventId, userId);
  }

  /**
   * Создаёт долг по строке расчёта: текущий пользователь должен `toUserId`.
   * Долг создаётся как обычный (status Pending) — кредитор подтверждает его в
   * боте. Возвращает данные для Telegram-уведомления (шлёт API-слой).
   */
  async createDebtFromSettlement(
    eventId: number,
    userId: number,
    toUserId: number
  ): Promise<EventDebtResult> {
    const event = await this.deps.eventRepo.findById(eventId);
    if (!event) throw new EventError("Событие не найдено", "not_found");
    if (event.status !== EventStatus.Settled || !event.settlement) {
      throw new EventError("Событие ещё не рассчитано");
    }
    const row = event.settlement.find(
      (r) => r.fromUserId === userId && r.toUserId === toUserId
    );
    if (!row) {
      throw new EventError("В расчёте нет такой строки", "not_found");
    }

    // Защита от дубля: по этой строке долг уже создан.
    const existing = await this.deps.debtRepo.findByEventId(eventId);
    if (
      existing.some((d) => d.debtorUserId === userId && d.creditorUserId === toUserId)
    ) {
      throw new EventError("Долг по этой строке уже создан");
    }

    const me = await this.deps.userService.findById(userId);
    const toUser = await this.deps.userService.findById(toUserId);
    const debt = await this.deps.debtRepo.create({
      creatorUserId: userId,
      debtorUserId: userId,
      creditorUserId: toUserId,
      debtorName: displayNameFor(me?.username, row.fromName),
      creditorName: displayNameFor(toUser?.username, row.toName),
      amount: row.amount,
      currency: row.currency,
      lentDate: new Date(),
      deadline: null,
      repaidAmount: 0,
      status: DebtStatus.Pending,
      mainUserId: toUserId,
      comment: `Долг за событие «${event.name}»`,
      eventId: event.id,
    });

    return {
      debtId: debt.id,
      creditorTelegramId: toUser ? Number(toUser.telegramId) : 0,
      debtorName: displayNameFor(me?.username, row.fromName),
      amount: row.amount,
      currency: row.currency,
      eventName: event.name,
    };
  }

  // --- Контекст для LLM (bot) -------------------------------------------

  /** Активные события пользователя для промпта парсера трат. */
  async getActiveEventsContext(
    userId: number
  ): Promise<Array<{ name: string; description: string; keywords: string }>> {
    const events = await this.deps.eventRepo.findActiveEventsForUser(userId);
    return events.map((e) => ({
      name: e.name,
      description: e.description,
      keywords: e.keywords,
    }));
  }

  /** Ищет активное событие пользователя по имени (для привязки трат из бота). */
  async findActiveEventByName(
    userId: number,
    name: string
  ): Promise<{ id: number; name: string } | null> {
    const target = name.trim().toLowerCase();
    if (!target) return null;
    const events = await this.deps.eventRepo.findActiveEventsForUser(userId);
    const match = events.find((e) => e.name.trim().toLowerCase() === target);
    return match ? { id: match.id, name: match.name } : null;
  }

  // --- Внутреннее --------------------------------------------------------

  private async requireMembership(
    eventId: number,
    userId: number
  ): Promise<{ event: Event; membership: EventMember }> {
    const event = await this.deps.eventRepo.findById(eventId);
    if (!event) throw new EventError("Событие не найдено", "not_found");
    const membership = await this.deps.eventRepo.findMembership(eventId, userId);
    if (!membership) {
      throw new EventError("Нет доступа к событию", "forbidden");
    }
    return { event, membership };
  }

  private async getOwnEventTx(
    txId: number,
    eventId: number,
    userId: number
  ): Promise<Transaction> {
    const tx = await this.deps.transactionRepo.findEventTransactionById(txId);
    if (!tx || tx.eventId !== eventId)
      throw new EventError("Транзакция не найдена", "not_found");
    if (tx.userId !== userId)
      throw new EventError("Можно управлять только своими тратами", "forbidden");
    return tx;
  }

  private async loadRatesSafe(): Promise<Record<string, number>> {
    try {
      return await this.fetchRates();
    } catch {
      // При недоступности курсов конвертируем 1:1 (лучше, чем падать).
      return {};
    }
  }

  private mapEventDto(
    event: Event,
    memberCount: number,
    myTotal: number,
    userId: number
  ): EventDto {
    return {
      id: event.id,
      name: event.name,
      description: event.description,
      keywords: event.keywords,
      currency: event.currency,
      status: event.status === EventStatus.Settled ? "settled" : "active",
      isCreator: event.creatorUserId === userId,
      memberCount,
      myTotal,
      createdAt: event.createdAt.toISOString(),
      settledAt: event.settledAt ? event.settledAt.toISOString() : null,
    };
  }

  private mapMember(
    m: EventMember,
    event: Event,
    userId: number,
    total: number
  ): EventMemberDto {
    return {
      userId: m.userId,
      username: m.user?.username ?? null,
      displayName: displayNameFor(m.user?.username, m.userId),
      isCreator: m.userId === event.creatorUserId,
      isMe: m.userId === userId,
      total,
    };
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
