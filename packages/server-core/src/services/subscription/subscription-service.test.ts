import { describe, it, expect, vi } from "vitest";
import type { DataSource } from "typeorm";
import { SubscriptionService, resolveEffectivePlan } from "./subscription-service";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  type Subscription,
} from "../../database/entities";

describe("resolveEffectivePlan", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it("платный план действует до expiresAt", () => {
    expect(
      resolveEffectivePlan({ plan: SubscriptionPlan.ProMonth, expiresAt: future })
    ).toBe(SubscriptionPlan.ProMonth);
  });

  it("после expiresAt платный план деградирует до free", () => {
    expect(
      resolveEffectivePlan({ plan: SubscriptionPlan.ProYear, expiresAt: past })
    ).toBe(SubscriptionPlan.Free);
  });

  it("free остаётся free", () => {
    expect(resolveEffectivePlan({ plan: SubscriptionPlan.Free, expiresAt: null })).toBe(
      SubscriptionPlan.Free
    );
  });
});

/** Подменяет репозиторий подписок: findOne возвращает заданную запись. */
function makeService(current: { linkRevokedAt: Date | null } | null) {
  const repo = { findOne: vi.fn(async () => current) };
  const dataSource = { getRepository: () => repo } as unknown as DataSource;
  return new SubscriptionService(dataSource);
}

describe("SubscriptionService.isPaymentLinkRevoked", () => {
  const cutoff = new Date(1_700_000_500 * 1000);

  it("без подписки ссылка не отозвана", async () => {
    const svc = makeService(null);
    expect(await svc.isPaymentLinkRevoked(1, 1_700_000_400)).toBe(false);
  });

  it("без linkRevokedAt ссылка не отозвана", async () => {
    const svc = makeService({ linkRevokedAt: null });
    expect(await svc.isPaymentLinkRevoked(1, 1_700_000_400)).toBe(false);
  });

  it("токен с iat не позднее cutoff отозван", async () => {
    const svc = makeService({ linkRevokedAt: cutoff });
    expect(await svc.isPaymentLinkRevoked(1, 1_700_000_400)).toBe(true);
    expect(await svc.isPaymentLinkRevoked(1, 1_700_000_500)).toBe(true);
  });

  it("более поздний токен (новая ссылка) валиден", async () => {
    const svc = makeService({ linkRevokedAt: cutoff });
    expect(await svc.isPaymentLinkRevoked(1, 1_700_000_600)).toBe(false);
  });

  it("без iat ссылка не отозвана", async () => {
    const svc = makeService({ linkRevokedAt: cutoff });
    expect(await svc.isPaymentLinkRevoked(1, undefined)).toBe(false);
  });
});

/** Сервис, у которого findCurrent отдаёт `current`, а save возвращает сохранённое. */
function makeActivateService(current: Partial<Subscription> | null) {
  const repo = {
    findOne: vi.fn(async () => current),
    create: vi.fn((v: Partial<Subscription>) => ({ ...v }) as Subscription),
    save: vi.fn(async (v: Subscription) => v),
  };
  const dataSource = { getRepository: () => repo } as unknown as DataSource;
  return new SubscriptionService(dataSource);
}

describe("SubscriptionService.activatePaid", () => {
  it("новая подписка: период от now", async () => {
    const svc = makeActivateService(null);
    const before = Date.now();
    const sub = await svc.activatePaid(1, SubscriptionPlan.ProYear);
    expect(sub.plan).toBe(SubscriptionPlan.ProYear);
    expect(sub.status).toBe(SubscriptionStatus.Active);
    expect(sub.startsAt!.getTime()).toBeGreaterThanOrEqual(before);
    // ~год вперёд от now
    expect(sub.expiresAt!.getFullYear()).toBe(new Date(before).getFullYear() + 1);
  });

  it("покупка поверх отменённой действующей подписки продлевает с её конца", async () => {
    const startsAt = new Date("2026-01-01T00:00:00Z");
    const expiresAt = new Date("2027-01-01T00:00:00Z");
    const svc = makeActivateService({
      userId: 1,
      plan: SubscriptionPlan.ProYear,
      status: SubscriptionStatus.Canceled,
      startsAt,
      expiresAt,
    });
    const sub = await svc.activatePaid(1, SubscriptionPlan.ProYear);
    expect(sub.status).toBe(SubscriptionStatus.Active);
    // startsAt не сбрасывается
    expect(sub.startsAt!.toISOString()).toBe(startsAt.toISOString());
    // новый конец — год от старого конца
    expect(sub.expiresAt!.toISOString()).toBe("2028-01-01T00:00:00.000Z");
  });

  it("покупка после истёкшего периода стартует от now", async () => {
    const svc = makeActivateService({
      userId: 1,
      plan: SubscriptionPlan.ProYear,
      status: SubscriptionStatus.Canceled,
      startsAt: new Date("2020-01-01T00:00:00Z"),
      expiresAt: new Date("2021-01-01T00:00:00Z"), // в прошлом
    });
    const before = Date.now();
    const sub = await svc.activatePaid(1, SubscriptionPlan.ProMonth);
    expect(sub.startsAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(sub.expiresAt!.getTime()).toBeGreaterThan(before);
  });
});
