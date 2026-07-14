import { describe, it, expect, vi } from "vitest";
import { AdminNotifyService } from "./admin-notify-service";
import { SubscriptionPlan } from "../../database/entities";

function makeUserService(users: {
  byId?: Record<number, { username: string | null; telegramId: number }>;
  byUsername?: Record<
    string,
    { telegramId: number; adminSubscriptionNotifications?: boolean }
  >;
}) {
  return {
    findById: vi.fn(async (id: number) => {
      const u = users.byId?.[id];
      return u ? { id, username: u.username, telegramId: u.telegramId } : null;
    }),
    findByUsername: vi.fn(async (name: string) => {
      const u = users.byUsername?.[name.toLowerCase()];
      return u ?? null;
    }),
  };
}

function makeService(
  superAdminUsername: string | null,
  users: Parameters<typeof makeUserService>[0] = {}
) {
  const userService = makeUserService(users);
  const send = vi.fn(async () => undefined);
  const service = new AdminNotifyService(
    superAdminUsername,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userService as any,
    send
  );
  return { service, userService, send };
}

describe("AdminNotifyService.subscriptionPaid", () => {
  it("шлёт сообщение админу, найденному по username", async () => {
    const { service, send } = makeService("admin", {
      byUsername: { admin: { telegramId: 777 } },
      byId: { 42: { username: "vasya", telegramId: 555 } },
    });
    await service.subscriptionPaid({
      userId: 42,
      plan: SubscriptionPlan.ProMonth,
      expiresAt: new Date("2027-01-01T00:00:00Z"),
    });
    expect(send).toHaveBeenCalledTimes(1);
    const [chatId, text] = send.mock.calls[0] as unknown as [number, string];
    expect(chatId).toBe(777);
    expect(text).toContain("Оплачена подписка");
    expect(text).toContain("Pro на месяц");
    expect(text).toContain("@vasya");
    expect(text).toContain("id 42");
  });

  it("продление помечается как «Продлена», тест-режим — предупреждением", async () => {
    const { service, send } = makeService("admin", {
      byUsername: { admin: { telegramId: 777 } },
    });
    await service.subscriptionPaid({
      userId: 42,
      plan: SubscriptionPlan.ProYear,
      expiresAt: null,
      renewal: true,
      test: true,
    });
    const [, text] = send.mock.calls[0] as unknown as [number, string];
    expect(text).toContain("Продлена подписка");
    expect(text).toContain("Тестовый режим");
  });

  it("молчит, если уведомления выключены тумблером в настройках", async () => {
    const { service, send } = makeService("admin", {
      byUsername: {
        admin: { telegramId: 777, adminSubscriptionNotifications: false },
      },
    });
    await service.subscriptionPaid({
      userId: 42,
      plan: SubscriptionPlan.ProMonth,
      expiresAt: null,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("молчит, если SUPER_ADMIN_USERNAME не задан", async () => {
    const { service, send } = makeService(null);
    await service.subscriptionPaid({
      userId: 42,
      plan: SubscriptionPlan.ProMonth,
      expiresAt: null,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("не бросает, если админ не найден среди пользователей бота", async () => {
    const { service, send } = makeService("admin", {});
    await expect(
      service.subscriptionPaid({
        userId: 42,
        plan: SubscriptionPlan.ProMonth,
        expiresAt: null,
      })
    ).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it("не бросает, если отправка в Telegram упала", async () => {
    const { service, send } = makeService("admin", {
      byUsername: { admin: { telegramId: 777 } },
    });
    send.mockRejectedValueOnce(new Error("bot service down"));
    await expect(
      service.subscriptionPaid({
        userId: 42,
        plan: SubscriptionPlan.ProMonth,
        expiresAt: null,
      })
    ).resolves.toBeUndefined();
  });
});

describe("AdminNotifyService.subscriptionCanceled", () => {
  it("шлёт сообщение с причиной и сроком доступа", async () => {
    const { service, send } = makeService("admin", {
      byUsername: { admin: { telegramId: 777 } },
      byId: { 42: { username: null, telegramId: 555 } },
    });
    await service.subscriptionCanceled({
      userId: 42,
      plan: SubscriptionPlan.ProMonth,
      expiresAt: new Date("2027-01-01T00:00:00Z"),
      reason: "user",
    });
    const [, text] = send.mock.calls[0] as unknown as [number, string];
    expect(text).toContain("Отменена подписка");
    expect(text).toContain("отменена пользователем");
    expect(text).toContain("Пользователь 555");
    expect(text).toContain("Доступ сохраняется до");
  });

  it("различает причину payment_failed", async () => {
    const { service, send } = makeService("admin", {
      byUsername: { admin: { telegramId: 777 } },
    });
    await service.subscriptionCanceled({
      userId: 42,
      plan: SubscriptionPlan.ProMonth,
      expiresAt: null,
      reason: "payment_failed",
    });
    const [, text] = send.mock.calls[0] as unknown as [number, string];
    expect(text).toContain("не прошло очередное списание");
  });
});
