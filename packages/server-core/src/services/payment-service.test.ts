import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PaymentService,
  PaymentError,
  type PaymentGatewayConfig,
} from "./payment-service";
import { SubscriptionPlan } from "../database/entities";

function makeSubscriptionService() {
  return {
    activatePaid: vi.fn(async (userId: number, plan: SubscriptionPlan) => ({
      userId,
      plan,
    })),
  };
}

function makePlanConfig(price: number | null) {
  return {
    getPlans: vi.fn(async () => [
      { planId: "pro_month", price, period: "month" },
      { planId: "pro_year", price: price == null ? null : price * 10, period: "year" },
    ]),
  };
}

const BEPAID_CFG: PaymentGatewayConfig["bepaid"] = {
  shopId: "shop-1",
  secretKey: "secret-xyz",
  checkoutBaseUrl: "https://checkout.bepaid.by",
  gatewayBaseUrl: "https://gateway.bepaid.by",
  testMode: true,
  currency: "BYN",
  returnUrl: "https://l/payment-success",
  cancelUrl: "https://l/payment-failed",
  notifyUrl: "https://api/api/billing/webhook",
};

function makeService(
  gateway: "test" | "bepaid",
  price: number | null = 9.99,
  bepaid = BEPAID_CFG
) {
  const subscriptionService = makeSubscriptionService();
  const planConfig = makePlanConfig(price);
  const service = new PaymentService(
    { gateway, bepaid },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriptionService as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    planConfig as any
  );
  return { service, subscriptionService, planConfig };
}

/** Мок fetch с очередью ответов (по порядку вызовов). */
function mockFetchOnce(handler: (url: string, init?: RequestInit) => unknown) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const body = handler(url, init);
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PaymentService.checkout", () => {
  it("в test-режиме сразу оформляет подписку", async () => {
    const { service, subscriptionService } = makeService("test");
    const result = await service.checkout(42, SubscriptionPlan.ProMonth);
    expect(result.mode).toBe("test");
    expect(subscriptionService.activatePaid).toHaveBeenCalledWith(
      42,
      SubscriptionPlan.ProMonth
    );
  });

  it("в bepaid-режиме создаёт checkout и возвращает токен виджета", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    mockFetchOnce((_url, init) => {
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return { checkout: { token: "tok-123", redirect_url: "https://pay" } };
    });
    const { service } = makeService("bepaid", 9.99);
    const result = await service.checkout(42, SubscriptionPlan.ProMonth);
    if (result.mode !== "widget") throw new Error("ожидался widget");
    expect(result.token).toBe("tok-123");
    expect(result.checkoutUrl).toBe(BEPAID_CFG.checkoutBaseUrl);
    expect(result.test).toBe(true);

    // Тело запроса: сумма в минимальных единицах, валюта, tracking_id вида "42-m-…".
    const order = (
      capturedBody as unknown as { checkout: { order: Record<string, unknown> } }
    ).checkout.order;
    expect(order.amount).toBe(999);
    expect(order.currency).toBe("BYN");
    expect(String(order.tracking_id)).toMatch(/^42-m-/);
  });

  it("бросает PaymentError, если bePaid не настроен", async () => {
    const { service } = makeService("bepaid", 9.99, { ...BEPAID_CFG, shopId: "" });
    await expect(service.checkout(1, SubscriptionPlan.ProMonth)).rejects.toBeInstanceOf(
      PaymentError
    );
  });

  it("бросает PaymentError, если цена тарифа не задана", async () => {
    const { service } = makeService("bepaid", null);
    await expect(service.checkout(1, SubscriptionPlan.ProMonth)).rejects.toBeInstanceOf(
      PaymentError
    );
  });
});

describe("PaymentService.handleNotify", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("активирует подписку при подтверждённом успешном статусе", async () => {
    mockFetchOnce(() => ({
      transaction: { uid: "tx-777", status: "successful", tracking_id: "42-m-abc" },
    }));
    const { service, subscriptionService } = makeService("bepaid");
    const res = await service.handleNotify({ transaction: { uid: "tx-777" } });
    expect(res).toEqual({ received: true, activated: true });
    expect(subscriptionService.activatePaid).toHaveBeenCalledWith(
      42,
      SubscriptionPlan.ProMonth,
      { webpayOrderId: "42-m-abc", paymentId: "tx-777" }
    );
  });

  it("не активирует, если статус транзакции не successful", async () => {
    mockFetchOnce(() => ({
      transaction: { uid: "tx-777", status: "failed", tracking_id: "42-m-abc" },
    }));
    const { service, subscriptionService } = makeService("bepaid");
    const res = await service.handleNotify({ transaction: { uid: "tx-777" } });
    expect(res).toEqual({ received: true, activated: false });
    expect(subscriptionService.activatePaid).not.toHaveBeenCalled();
  });

  it("не активирует без uid в теле webhook", async () => {
    const fetchFn = mockFetchOnce(() => ({}));
    const { service, subscriptionService } = makeService("bepaid");
    const res = await service.handleNotify({ transaction: {} });
    expect(res).toEqual({ received: true, activated: false });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(subscriptionService.activatePaid).not.toHaveBeenCalled();
  });

  it("игнорирует notify в test-режиме", async () => {
    const { service, subscriptionService } = makeService("test");
    const res = await service.handleNotify({ transaction: { uid: "tx-777" } });
    expect(res).toEqual({ received: true, activated: false });
    expect(subscriptionService.activatePaid).not.toHaveBeenCalled();
  });
});
