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
