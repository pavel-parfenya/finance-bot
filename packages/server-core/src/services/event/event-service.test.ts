/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory fake-репозитории в тестах */
import { describe, it, expect } from "vitest";
import {
  computeSettlement,
  convertAmount,
  type SettlementParticipant,
} from "./event-service.utils";
import { EventService, EventError } from "./event-service";
import type { EventServiceDeps } from "./event-service.types";
import { EventStatus, InvitationStatus } from "../../database/entities";

function sumIn(transfers: ReturnType<typeof computeSettlement>, userId: number): number {
  let net = 0;
  for (const t of transfers) {
    if (t.toUserId === userId) net += t.amount;
    if (t.fromUserId === userId) net -= t.amount;
  }
  return Math.round(net * 100) / 100;
}

describe("computeSettlement", () => {
  it("пример из ТЗ: owner 50, user2 500, user1 210 (исключённое не в счёт)", () => {
    const participants: SettlementParticipant[] = [
      { userId: 1, name: "@owner", paid: 50 },
      { userId: 2, name: "@user2", paid: 500 },
      { userId: 3, name: "@user1", paid: 210 },
    ];
    const transfers = computeSettlement(participants);

    // Доля = 760 / 3 = 253.33. user2 переплатил и получает; owner и user1 должны.
    expect(sumIn(transfers, 2)).toBeCloseTo(246.67, 2);
    expect(sumIn(transfers, 1)).toBeCloseTo(-203.34, 2);
    expect(sumIn(transfers, 3)).toBeCloseTo(-43.33, 2);

    // Минимум переводов: ≤ N−1 = 2.
    expect(transfers.length).toBeLessThanOrEqual(2);
    // Все переводы идут кредитору user2.
    for (const t of transfers) expect(t.toUserId).toBe(2);
  });

  it("сумма всех переводов замыкается в ноль", () => {
    const participants: SettlementParticipant[] = [
      { userId: 1, name: "a", paid: 100 },
      { userId: 2, name: "b", paid: 0 },
      { userId: 3, name: "c", paid: 50 },
      { userId: 4, name: "d", paid: 30 },
    ];
    const transfers = computeSettlement(participants);
    const net = participants.reduce((s, p) => s + sumIn(transfers, p.userId), 0);
    expect(Math.abs(net)).toBeLessThan(0.001);
    expect(transfers.length).toBeLessThanOrEqual(3);
  });

  it("равные траты — переводов нет", () => {
    const transfers = computeSettlement([
      { userId: 1, name: "a", paid: 100 },
      { userId: 2, name: "b", paid: 100 },
    ]);
    expect(transfers).toHaveLength(0);
  });

  it("один участник — переводов нет", () => {
    expect(computeSettlement([{ userId: 1, name: "a", paid: 100 }])).toHaveLength(0);
  });

  it("нет трат — переводов нет", () => {
    expect(
      computeSettlement([
        { userId: 1, name: "a", paid: 0 },
        { userId: 2, name: "b", paid: 0 },
      ])
    ).toHaveLength(0);
  });

  it("один заплатил за всех", () => {
    const transfers = computeSettlement([
      { userId: 1, name: "payer", paid: 300 },
      { userId: 2, name: "b", paid: 0 },
      { userId: 3, name: "c", paid: 0 },
    ]);
    // b и c должны по 100 payer'у.
    expect(sumIn(transfers, 1)).toBeCloseTo(200, 2);
    expect(sumIn(transfers, 2)).toBeCloseTo(-100, 2);
    expect(sumIn(transfers, 3)).toBeCloseTo(-100, 2);
  });
});

describe("convertAmount", () => {
  const rates = { USD: 1, RUB: 90, BYN: 3 };

  it("та же валюта — без изменений", () => {
    expect(convertAmount(130, "RUB", "RUB", rates)).toBe(130);
  });

  it("BYN → RUB через USD", () => {
    // 130 BYN = 130/3 USD ≈ 43.33 USD → ×90 = 3900 RUB
    expect(convertAmount(130, "BYN", "RUB", rates)).toBeCloseTo(3900, 2);
  });

  it("неизвестная валюта — курс 1", () => {
    expect(convertAmount(100, "XXX", "RUB", rates)).toBeCloseTo(9000, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EventService — сценарии и права (in-memory моки зависимостей).
// ─────────────────────────────────────────────────────────────────────────────

interface FakeUser {
  id: number;
  username: string | null;
  telegramId: string;
  defaultCurrency: string | null;
}

/** Собирает EventService с in-memory реализациями репозиториев и сервисов. */
function setup(opts?: { proUserIds?: number[] }) {
  const proSet = new Set(opts?.proUserIds ?? []);
  const users = new Map<number, FakeUser>();
  const usersByName = new Map<string, FakeUser>();
  function addUser(u: FakeUser): void {
    users.set(u.id, u);
    if (u.username) usersByName.set(u.username.toLowerCase(), u);
  }

  let eventSeq = 1;
  let invSeq = 1;
  let txSeq = 1;
  const events = new Map<number, any>();
  const members: Array<{ eventId: number; userId: number; role: string }> = [];
  const invitations = new Map<number, any>();
  const txs = new Map<number, any>();
  const debts: any[] = [];

  const eventRepo = {
    async create(data: any) {
      const e = {
        id: eventSeq++,
        ...data,
        status: EventStatus.Active,
        settlement: null,
        settledAt: null,
        createdAt: new Date(),
      };
      events.set(e.id, e);
      return e;
    },
    async findById(id: number) {
      return events.get(id) ?? null;
    },
    async updateInfo(id: number, u: any) {
      Object.assign(events.get(id), u);
    },
    async saveSettlement(id: number, s: any, at: Date) {
      const e = events.get(id);
      e.settlement = s;
      e.settledAt = at;
      e.status = EventStatus.Settled;
    },
    async delete(id: number) {
      events.delete(id);
      for (const [k, v] of invitations) if (v.eventId === id) invitations.delete(k);
      for (let i = members.length - 1; i >= 0; i--)
        if (members[i].eventId === id) members.splice(i, 1);
    },
    async findEventsForUser(userId: number) {
      const ids = members.filter((m) => m.userId === userId).map((m) => m.eventId);
      return [...events.values()].filter((e) => ids.includes(e.id));
    },
    async findActiveEventsForUser(userId: number) {
      const list = await this.findEventsForUser(userId);
      return list.filter((e: any) => e.status === EventStatus.Active);
    },
    async addMember(eventId: number, userId: number, role: string) {
      if (!members.find((m) => m.eventId === eventId && m.userId === userId))
        members.push({ eventId, userId, role });
    },
    async removeMember(eventId: number, userId: number) {
      const i = members.findIndex((m) => m.eventId === eventId && m.userId === userId);
      if (i >= 0) members.splice(i, 1);
    },
    async findMembers(eventId: number) {
      return members
        .filter((m) => m.eventId === eventId)
        .map((m) => ({ ...m, user: users.get(m.userId) }));
    },
    async findMembership(eventId: number, userId: number) {
      const m = members.find((m) => m.eventId === eventId && m.userId === userId);
      return m ? { ...m, user: users.get(m.userId) } : null;
    },
    async countMembers(eventId: number) {
      return members.filter((m) => m.eventId === eventId).length;
    },
    async createInvitation(eventId: number, inviterId: number, inviteeId: number) {
      const inv = {
        id: invSeq++,
        eventId,
        inviterId,
        inviteeId,
        status: InvitationStatus.Pending,
        event: events.get(eventId),
        inviter: users.get(inviterId),
        invitee: users.get(inviteeId),
        createdAt: new Date(),
      };
      invitations.set(inv.id, inv);
      return inv;
    },
    async findInvitationById(id: number) {
      return invitations.get(id) ?? null;
    },
    async findPendingInvitation(eventId: number, inviteeId: number) {
      return (
        [...invitations.values()].find(
          (i) =>
            i.eventId === eventId &&
            i.inviteeId === inviteeId &&
            i.status === InvitationStatus.Pending
        ) ?? null
      );
    },
    async updateInvitationStatus(id: number, status: InvitationStatus) {
      invitations.get(id).status = status;
    },
  };

  const transactionRepo = {
    async findByEventId(eventId: number) {
      return [...txs.values()]
        .filter((t) => t.eventId === eventId)
        .map((t) => ({ ...t, user: users.get(t.userId) }));
    },
    async findEventTransactionById(id: number) {
      const t = txs.get(id);
      return t ? { ...t, user: users.get(t.userId) } : null;
    },
    async setEventId(id: number, eventId: number | null) {
      txs.get(id).eventId = eventId;
    },
    async setExcludedFromEvent(id: number, ex: boolean) {
      txs.get(id).excludedFromEvent = ex;
    },
    async clearEventForUser(eventId: number, userId: number) {
      for (const t of txs.values())
        if (t.eventId === eventId && t.userId === userId) {
          t.eventId = null;
          t.excludedFromEvent = false;
        }
    },
    async clearEventAll(eventId: number) {
      for (const t of txs.values())
        if (t.eventId === eventId) {
          t.eventId = null;
          t.excludedFromEvent = false;
        }
    },
    async deleteById(id: number) {
      txs.delete(id);
    },
  };

  const debtRepo = {
    async create(data: any) {
      const d = { id: debts.length + 1, ...data };
      debts.push(d);
      return d;
    },
    async findByEventId(eventId: number) {
      return debts.filter((d) => d.eventId === eventId);
    },
  };

  const userService = {
    async getDefaultCurrency(id: number) {
      return users.get(id)?.defaultCurrency ?? null;
    },
    async findByUsername(name: string) {
      return usersByName.get(name.toLowerCase()) ?? null;
    },
    async findById(id: number) {
      return users.get(id) ?? null;
    },
  };

  const featureService = {
    async hasFeature(userId: number, key: string) {
      return key === "events" ? proSet.has(userId) : true;
    },
  };

  const deps = {
    eventRepo,
    transactionRepo,
    debtRepo,
    userService,
    workspaceService: {},
    featureService,
    fetchRates: async () => ({ USD: 1, RUB: 90, BYN: 3 }),
  } as unknown as EventServiceDeps;

  const service = new EventService(deps);

  /** Имитирует трату, сохранённую ботом с привязкой к событию. */
  function addTx(
    userId: number,
    eventId: number | null,
    amount: number,
    currency: string,
    o?: { excluded?: boolean; description?: string }
  ) {
    const t = {
      id: txSeq++,
      userId,
      eventId,
      amount,
      currency,
      excludedFromEvent: o?.excluded ?? false,
      description: o?.description ?? "трата",
      category: "cat",
      store: "",
      type: "expense",
      personDisplayName: users.get(userId)?.username ?? String(userId),
      occurredAt: new Date(),
      createdAt: new Date(),
    };
    txs.set(t.id, t);
    return t;
  }

  return { service, addUser, addTx, debts, events, txs, members };
}

describe("EventService — полный путь события (сценарий из ТЗ)", () => {
  async function buildShashlyki() {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "owner", telegramId: "1001", defaultCurrency: "RUB" });
    ctx.addUser({ id: 2, username: "user1", telegramId: "1002", defaultCurrency: "RUB" });
    ctx.addUser({ id: 3, username: "user2", telegramId: "1003", defaultCurrency: "RUB" });

    const ev = await ctx.service.create(1, {
      name: "Шашлыки на природе",
      description: "Всё что связано с отдыхом на природе",
      keywords: "шашлык, мясо, угли",
    });

    const inv1 = await ctx.service.invite(ev.id, 1, "@user1");
    await ctx.service.acceptInvite(inv1.invitationId, 2);
    const inv2 = await ctx.service.invite(ev.id, 1, "user2");
    await ctx.service.acceptInvite(inv2.invitationId, 3);

    ctx.addTx(1, ev.id, 50, "RUB", { description: "продукты для шашлыков" });
    ctx.addTx(3, ev.id, 500, "RUB", { description: "алкоголь" });
    ctx.addTx(2, ev.id, 130, "RUB", { description: "мясо и угли" });
    const beer = ctx.addTx(1, ev.id, 33, "RUB", { description: "безалкогольное пиво" });
    ctx.addTx(2, ev.id, 80, "RUB", { description: "бензин" });

    return { ...ctx, ev, beer };
  }

  it("создание PRO-пользователем, приглашения, траты, исключение, расчёт, долг", async () => {
    const { service, ev, beer, debts } = await buildShashlyki();

    // @owner помечает пиво «исключить из расчёта»
    await service.setExcluded(ev.id, 1, beer.id, true);

    const before = await service.getEventDetail(ev.id, 1);
    expect(before.members).toHaveLength(3);
    expect(before.myTransactions).toHaveLength(2); // owner: продукты + пиво
    expect(before.allTransactions).toHaveLength(5);
    // myTotal owner учитывает только продукты (пиво исключено)
    expect(before.myTotal).toBeCloseTo(50, 2);

    // @owner «Завершить и рассчитать»
    const settled = await service.settle(ev.id, 1);
    expect(settled.status).toBe("settled");
    const s = settled.settlement!;

    // Все переводы идут переплатившему @user2 (id=3)
    for (const r of s) expect(r.toUserId).toBe(3);
    expect(s.reduce((a, r) => a + r.amount, 0)).toBeCloseTo(246.67, 2);
    // Должны и @owner, и @user1
    expect(s.find((r) => r.fromUserId === 1)).toBeTruthy();
    expect(s.find((r) => r.fromUserId === 2)).toBeTruthy();
    // Минимум переводов
    expect(s.length).toBeLessThanOrEqual(2);

    // @owner создаёт долг из своей строки расчёта
    const ownerRow = s.find((r) => r.fromUserId === 1)!;
    const debtRes = await service.createDebtFromSettlement(ev.id, 1, ownerRow.toUserId);
    expect(debts).toHaveLength(1);
    expect(debts[0].debtorUserId).toBe(1);
    expect(debts[0].creditorUserId).toBe(3);
    expect(debts[0].mainUserId).toBe(3);
    expect(debts[0].currency).toBe("RUB");
    expect(debts[0].comment).toContain("Шашлыки на природе");
    expect(Number(debts[0].amount)).toBeCloseTo(ownerRow.amount, 2);
    // Как обычный долг: Pending + привязан к событию + данные для уведомления
    expect(debts[0].status).toBe("pending");
    expect(debts[0].eventId).toBe(ev.id);
    expect(debtRes.creditorTelegramId).toBe(1003);

    // Повторное создание по той же строке — запрещено
    await expect(
      service.createDebtFromSettlement(ev.id, 1, ownerRow.toUserId)
    ).rejects.toBeInstanceOf(EventError);

    // В деталях строка помечена debtCreated
    const after = await service.getEventDetail(ev.id, 1);
    const ownerRowAfter = after.settlement!.find((r) => r.fromUserId === 1)!;
    expect(ownerRowAfter.debtCreated).toBe(true);
    const otherRow = after.settlement!.find((r) => r.fromUserId === 2)!;
    expect(otherRow.debtCreated).toBe(false);
  });

  it("исключённая трата не попадает в расчёт", async () => {
    const { service, ev, beer } = await buildShashlyki();
    // Без исключения пива доли иные; исключаем и сверяем сумму переводов.
    await service.setExcluded(ev.id, 1, beer.id, true);
    const settled = await service.settle(ev.id, 1);
    // total учитываемых = 760, доля 253.33 → переплата user2 = 246.67
    expect(settled.settlement!.reduce((a, r) => a + r.amount, 0)).toBeCloseTo(246.67, 2);
  });

  it("детали: мои траты видны только автору, все траты — всем", async () => {
    const { service, ev } = await buildShashlyki();
    const asUser1 = await service.getEventDetail(ev.id, 2);
    expect(asUser1.allTransactions).toHaveLength(5);
    expect(asUser1.myTransactions.every((t) => t.userId === 2)).toBe(true);
    expect(asUser1.myTransactions).toHaveLength(2); // user1: мясо и угли + бензин
  });
});

describe("EventService — мультивалюта", () => {
  it("траты в другой валюте приводятся к валюте события по курсу", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "a", telegramId: "1", defaultCurrency: "RUB" });
    ctx.addUser({ id: 2, username: "b", telegramId: "2", defaultCurrency: "BYN" });
    const ev = await ctx.service.create(1, { name: "E", currency: "RUB" });
    const inv = await ctx.service.invite(ev.id, 1, "b");
    await ctx.service.acceptInvite(inv.invitationId, 2);

    ctx.addTx(1, ev.id, 100, "RUB"); // 100 RUB
    ctx.addTx(2, ev.id, 30, "BYN"); // 30 BYN → 30/3*90 = 900 RUB

    const detail = await ctx.service.getEventDetail(ev.id, 1);
    const bTx = detail.allTransactions.find((t) => t.userId === 2)!;
    expect(bTx.amountInEventCurrency).toBeCloseTo(900, 2);

    const settled = await ctx.service.settle(ev.id, 1);
    // total = 1000 RUB, доля 500. a переплатил? a=100, b=900. a должен b 400.
    const row = settled.settlement![0];
    expect(row.fromUserId).toBe(1);
    expect(row.toUserId).toBe(2);
    expect(row.amount).toBeCloseTo(400, 2);
    expect(row.currency).toBe("RUB");
  });
});

describe("EventService — права и валидация", () => {
  it("создать событие может только PRO", async () => {
    const ctx = setup({ proUserIds: [] });
    ctx.addUser({ id: 1, username: "free", telegramId: "1", defaultCurrency: "RUB" });
    await expect(ctx.service.create(1, { name: "E" })).rejects.toMatchObject({
      code: "gated",
    });
  });

  it("участие бесплатно: FREE-приглашённый пользуется событием", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "owner", telegramId: "1", defaultCurrency: "RUB" });
    ctx.addUser({ id: 2, username: "free", telegramId: "2", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    const inv = await ctx.service.invite(ev.id, 1, "free");
    const acc = await ctx.service.acceptInvite(inv.invitationId, 2);
    expect(acc.ok).toBe(true);
    // FREE-участник видит детали
    const d = await ctx.service.getEventDetail(ev.id, 2);
    expect(d.members).toHaveLength(2);
  });

  it("пустое название — ошибка", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    await expect(ctx.service.create(1, { name: "   " })).rejects.toBeInstanceOf(
      EventError
    );
  });

  it("валюта события по умолчанию — из профиля создателя", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "BYN" });
    const ev = await ctx.service.create(1, { name: "E" });
    expect(ev.currency).toBe("BYN");
  });

  it("не-участник не видит событие", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    ctx.addUser({ id: 9, username: "stranger", telegramId: "9", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    await expect(ctx.service.getEventDetail(ev.id, 9)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("нельзя пригласить самого себя и дважды", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    ctx.addUser({ id: 2, username: "b", telegramId: "2", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    await expect(ctx.service.invite(ev.id, 1, "o")).rejects.toBeInstanceOf(EventError);
    await ctx.service.invite(ev.id, 1, "b");
    await expect(ctx.service.invite(ev.id, 1, "b")).rejects.toBeInstanceOf(EventError);
  });

  it("завершить и рассчитать может только создатель", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    ctx.addUser({ id: 2, username: "b", telegramId: "2", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    const inv = await ctx.service.invite(ev.id, 1, "b");
    await ctx.service.acceptInvite(inv.invitationId, 2);
    await expect(ctx.service.settle(ev.id, 2)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("удалить событие может только создатель; траты отвязываются", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    ctx.addUser({ id: 2, username: "b", telegramId: "2", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    const inv = await ctx.service.invite(ev.id, 1, "b");
    await ctx.service.acceptInvite(inv.invitationId, 2);
    const tx = ctx.addTx(2, ev.id, 10, "RUB");

    await expect(ctx.service.deleteEvent(ev.id, 2)).rejects.toMatchObject({
      code: "forbidden",
    });
    await ctx.service.deleteEvent(ev.id, 1);
    // трата осталась, но отвязана
    expect(ctx.txs.get(tx.id).eventId).toBeNull();
  });

  it("удалить/исключить чужую трату нельзя (кроме исключения создателем)", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    ctx.addUser({ id: 2, username: "b", telegramId: "2", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    const inv = await ctx.service.invite(ev.id, 1, "b");
    await ctx.service.acceptInvite(inv.invitationId, 2);
    const bTx = ctx.addTx(2, ev.id, 10, "RUB");

    // owner не может удалить чужую трату
    await expect(ctx.service.deleteTransaction(ev.id, 1, bTx.id)).rejects.toMatchObject({
      code: "forbidden",
    });
    // обычный участник не может исключить чужую
    const oTx = ctx.addTx(1, ev.id, 20, "RUB");
    await expect(ctx.service.setExcluded(ev.id, 2, oTx.id, true)).rejects.toMatchObject({
      code: "forbidden",
    });
    // но создатель может исключить любую
    await ctx.service.setExcluded(ev.id, 1, bTx.id, true);
    expect(ctx.txs.get(bTx.id).excludedFromEvent).toBe(true);
  });

  it("выход из события: участник может, создатель — нет; траты отвязываются", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    ctx.addUser({ id: 2, username: "b", telegramId: "2", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    const inv = await ctx.service.invite(ev.id, 1, "b");
    await ctx.service.acceptInvite(inv.invitationId, 2);
    const bTx = ctx.addTx(2, ev.id, 10, "RUB");

    await expect(ctx.service.leaveEvent(ev.id, 1)).rejects.toMatchObject({
      code: "forbidden",
    });
    await ctx.service.leaveEvent(ev.id, 2);
    expect(
      ctx.members.find((m) => m.eventId === ev.id && m.userId === 2)
    ).toBeUndefined();
    expect(ctx.txs.get(bTx.id).eventId).toBeNull();
  });

  it("нельзя рассчитать дважды и менять траты после расчёта", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    const tx = ctx.addTx(1, ev.id, 10, "RUB");
    await ctx.service.settle(ev.id, 1);
    await expect(ctx.service.settle(ev.id, 1)).rejects.toBeInstanceOf(EventError);
    await expect(ctx.service.setExcluded(ev.id, 1, tx.id, true)).rejects.toBeInstanceOf(
      EventError
    );
  });

  it("createDebtFromSettlement требует строку расчёта текущего пользователя", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "E" });
    ctx.addTx(1, ev.id, 10, "RUB");
    await ctx.service.settle(ev.id, 1);
    // событие с одним участником — переводов нет → строки нет
    await expect(
      ctx.service.createDebtFromSettlement(ev.id, 1, 999)
    ).rejects.toBeInstanceOf(EventError);
  });
});

describe("EventService — контекст для LLM", () => {
  it("getActiveEventsContext отдаёт имя/описание/ключевые слова активных событий", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    await ctx.service.create(1, {
      name: "Шашлыки",
      description: "отдых",
      keywords: "мясо, угли",
    });
    const list = await ctx.service.getActiveEventsContext(1);
    expect(list).toEqual([
      { name: "Шашлыки", description: "отдых", keywords: "мясо, угли" },
    ]);
  });

  it("findActiveEventByName матчит без учёта регистра, settled не активно", async () => {
    const ctx = setup({ proUserIds: [1] });
    ctx.addUser({ id: 1, username: "o", telegramId: "1", defaultCurrency: "RUB" });
    const ev = await ctx.service.create(1, { name: "Шашлыки на природе" });
    expect(
      await ctx.service.findActiveEventByName(1, "шашлыки на природе")
    ).toMatchObject({
      id: ev.id,
    });
    ctx.addTx(1, ev.id, 5, "RUB");
    await ctx.service.settle(ev.id, 1);
    expect(await ctx.service.findActiveEventByName(1, "Шашлыки на природе")).toBeNull();
  });
});
