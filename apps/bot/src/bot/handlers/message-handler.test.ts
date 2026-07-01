import { describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { handleParsedMessage } from "./message-handler";
import type { BotDeps } from "../bot";
import type { ParsedMessage } from "../message-router";

/**
 * Гейтинг фичи `debts` на стороне бота: распознанный долг не должен создаваться,
 * если у тарифа пользователя нет фичи `debts`.
 */
const debtParsed = {
  type: "debt",
  data: {
    otherPersonName: "Петя",
    amount: 500,
    currency: "USD",
  },
} as unknown as ParsedMessage;

function makeDeps(hasFeature: boolean) {
  const createFromParsed = vi.fn(async () => ({
    debt: { id: 1, status: "active" },
    linkedUserTelegramId: undefined,
    notificationMessage: "Долг записан",
  }));
  const deps = {
    featureService: { hasFeature: vi.fn(async () => hasFeature) },
    debtService: { createFromParsed },
  } as unknown as BotDeps;
  return { deps, createFromParsed };
}

function makeCtx() {
  const reply = vi.fn(async () => undefined);
  const ctx = {
    reply,
    message: { date: 0 },
    api: { sendMessage: vi.fn() },
  } as unknown as Context;
  return { ctx, reply };
}

const opts = { userId: 1, displayName: "Вася", originalText: "Петя должен 500" };

describe("handleParsedMessage — гейтинг фичи debts", () => {
  it("без фичи debts отвечает апселлом и не создаёт долг", async () => {
    const { deps, createFromParsed } = makeDeps(false);
    const { ctx, reply } = makeCtx();

    await handleParsedMessage(ctx, debtParsed, deps, opts);

    expect(deps.featureService.hasFeature).toHaveBeenCalledWith(1, "debts");
    expect(createFromParsed).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.stringContaining("платном тарифе"));
  });

  it("с фичей debts создаёт долг", async () => {
    const { deps, createFromParsed } = makeDeps(true);
    const { ctx } = makeCtx();

    await handleParsedMessage(ctx, debtParsed, deps, opts);

    expect(createFromParsed).toHaveBeenCalledTimes(1);
  });
});

/**
 * Месячная квота транзакций: при достижении лимита новая трата не сохраняется,
 * бот отвечает сообщением о лимите и не трогает workspace.
 */
const expenseParsed = {
  type: "expense",
  data: {
    username: "Вася",
    description: "кофе",
    category: "Еда",
    amount: 5,
    currency: "BYN",
    store: "-",
    type: "expense",
    date: new Date(0),
  },
} as unknown as ParsedMessage;

function makeExpenseDeps(limit: number | null, used: number) {
  const getOrCreateWorkspaceForUser = vi.fn(async () => ({ id: 10 }));
  const deps = {
    featureService: { getMonthlyTransactionLimit: vi.fn(async () => limit) },
    transactionRepo: { countByAuthorCreatedSince: vi.fn(async () => used) },
    workspaceService: { getOrCreateWorkspaceForUser },
    miniAppUrl: "", // нет HTTPS Mini App → текстовый фолбэк без web_app-кнопки
  } as unknown as BotDeps;
  return { deps, getOrCreateWorkspaceForUser };
}

describe("handleParsedMessage — месячный лимит транзакций", () => {
  it("за лимитом не сохраняет трату и сообщает о лимите", async () => {
    const { deps, getOrCreateWorkspaceForUser } = makeExpenseDeps(100, 100);
    const { ctx, reply } = makeCtx();

    await handleParsedMessage(ctx, expenseParsed, deps, opts);

    expect(getOrCreateWorkspaceForUser).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.stringContaining("лимит"));
  });

  it("в пределах лимита продолжает обычный поток сохранения", async () => {
    vi.useFakeTimers();
    const { deps, getOrCreateWorkspaceForUser } = makeExpenseDeps(100, 5);
    const reply = vi.fn(async () => ({ chat: { id: 1 }, message_id: 2 }));
    const ctx = {
      reply,
      message: { date: 0 },
      api: { editMessageText: vi.fn() },
    } as unknown as Context;

    await handleParsedMessage(ctx, expenseParsed, deps, opts);

    expect(getOrCreateWorkspaceForUser).toHaveBeenCalledTimes(1);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("безлимитный тариф (null) не считает транзакции и сохраняет", async () => {
    vi.useFakeTimers();
    const { deps, getOrCreateWorkspaceForUser } = makeExpenseDeps(null, 999);
    const reply = vi.fn(async () => ({ chat: { id: 1 }, message_id: 2 }));
    const ctx = {
      reply,
      message: { date: 0 },
      api: { editMessageText: vi.fn() },
    } as unknown as Context;

    await handleParsedMessage(ctx, expenseParsed, deps, opts);

    expect(deps.transactionRepo.countByAuthorCreatedSince).not.toHaveBeenCalled();
    expect(getOrCreateWorkspaceForUser).toHaveBeenCalledTimes(1);
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});
