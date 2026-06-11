import { describe, it, expect, vi } from "vitest";
import type { DataSource } from "typeorm";
import { SubscriptionService, resolveEffectivePlan } from "./subscription-service";
import { SubscriptionPlan } from "../database/entities";

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
