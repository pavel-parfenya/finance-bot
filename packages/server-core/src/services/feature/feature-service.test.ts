import { describe, it, expect } from "vitest";
import { FeatureService } from "./feature-service";
import type { SubscriptionService } from "../subscription/subscription-service";
import type {
  PlanFeatureMap,
  StrapiPlanConfig,
} from "../../infrastructure/strapi/strapi-plan-config";

function fakeSub(plan: string, expiresAt: Date | null = null): SubscriptionService {
  return {
    getCurrentOrFree: async () => ({ plan, expiresAt }),
  } as unknown as SubscriptionService;
}

function fakeConfig(map: PlanFeatureMap | null): StrapiPlanConfig {
  return {
    getPlanFeatureMap: async () => map,
  } as unknown as StrapiPlanConfig;
}

const proMonthMap: PlanFeatureMap = new Map([
  ["free", new Set()],
  ["pro_month", new Set(["voice_input", "advanced_analytics"])],
]);

describe("FeatureService", () => {
  it("в free-режиме открывает все фичи (конфиг не нужен)", async () => {
    const svc = new FeatureService("free", fakeSub("free"), fakeConfig(null));
    expect(await svc.hasFeature(1, "voice_input")).toBe(true);
    expect(await svc.getUserFeatures(1)).toBeNull();
  });

  it("в paid-режиме при недоступном Strapi (null) не блокирует", async () => {
    const svc = new FeatureService("paid", fakeSub("free"), fakeConfig(null));
    expect(await svc.hasFeature(1, "voice_input")).toBe(true);
  });

  it("в paid-режиме отдаёт фичи плана пользователя", async () => {
    const svc = new FeatureService("paid", fakeSub("pro_month"), fakeConfig(proMonthMap));
    expect(await svc.hasFeature(1, "voice_input")).toBe(true);
    expect(await svc.hasFeature(1, "advanced_analytics")).toBe(true);
    expect(await svc.hasFeature(1, "debts")).toBe(false);
  });

  it("блокирует фичи на free-плане с пустым набором", async () => {
    const svc = new FeatureService("paid", fakeSub("free"), fakeConfig(proMonthMap));
    expect(await svc.hasFeature(1, "voice_input")).toBe(false);
  });

  it("не блокирует, если план вовсе не сконфигурирован в Strapi", async () => {
    const svc = new FeatureService("paid", fakeSub("pro_year"), fakeConfig(proMonthMap));
    expect(await svc.hasFeature(1, "voice_input")).toBe(true);
    expect(await svc.getUserFeatures(1)).toBeNull();
  });

  it("Pro действует до expiresAt", async () => {
    const future = new Date(Date.now() + 86_400_000);
    const svc = new FeatureService(
      "paid",
      fakeSub("pro_month", future),
      fakeConfig(proMonthMap)
    );
    expect(await svc.hasFeature(1, "voice_input")).toBe(true);
  });

  it("после expiresAt платный план деградирует до free и фичи режутся", async () => {
    const past = new Date(Date.now() - 86_400_000);
    const svc = new FeatureService(
      "paid",
      fakeSub("pro_month", past),
      fakeConfig(proMonthMap)
    );
    expect(await svc.hasFeature(1, "voice_input")).toBe(false);
  });
});
