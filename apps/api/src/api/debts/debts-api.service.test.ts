import { describe, expect, it, vi } from "vitest";
import { DebtsApiService } from "./debts-api.service";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import type { DebtCreateRequest } from "@finance-bot/shared";

/**
 * Гейтинг фичи `debts` на стороне сервера: создание долга через API/Mini App
 * должно блокироваться, если у тарифа пользователя нет фичи `debts`.
 */
function makeService(hasFeature: boolean) {
  const debtRepo = {
    create: vi.fn(async () => ({ id: 10, status: "active" })),
  };
  const userService = {};
  const featureService = { hasFeature: vi.fn(async () => hasFeature) };
  const telegram = { sendMessage: vi.fn() };
  const svc = new DebtsApiService(
    debtRepo as never,
    userService as never,
    featureService as never,
    telegram as never
  );
  return { svc, debtRepo, featureService };
}

const resolved = {
  userId: 1,
  creatorDisplayName: "Вася",
} as ResolvedTelegramUser;

const body: DebtCreateRequest = {
  iAmCreditor: true,
  amount: 100,
  currency: "USD",
} as DebtCreateRequest;

describe("DebtsApiService — гейтинг фичи debts", () => {
  it("блокирует создание долга без фичи debts и не трогает репозиторий", async () => {
    const { svc, debtRepo, featureService } = makeService(false);

    const res = await svc.create(resolved, body);

    expect(res).toHaveProperty("error");
    expect(featureService.hasFeature).toHaveBeenCalledWith(1, "debts");
    expect(debtRepo.create).not.toHaveBeenCalled();
  });

  it("с фичей debts пропускает создание долга в репозиторий", async () => {
    const { svc, debtRepo } = makeService(true);

    const res = await svc.create(resolved, body);

    expect(res).not.toHaveProperty("error");
    expect(debtRepo.create).toHaveBeenCalledTimes(1);
  });
});
