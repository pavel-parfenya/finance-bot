import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PaymentService,
  PaymentError,
  type PaymentGatewayConfig,
} from "./payment-service";
import { SubscriptionPlan } from "../../database/entities";

function makeSubscriptionService(current: unknown = null) {
  return {
    activatePaid: vi.fn(async (userId: number, plan: SubscriptionPlan) => ({
      userId,
      plan,
    })),
    findCurrent: vi.fn(async () => current),
    setPendingBepaidSubscription: vi.fn(async () => undefined),
    cancel: vi.fn(async () => ({ userId: 1, plan: SubscriptionPlan.Free })),
    cancelByBepaidId: vi.fn(async () => undefined),
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
  apiBaseUrl: "https://api.bepaid.by",
  testMode: true,
  currency: "BYN",
  returnUrl: "https://l/payment-success",
  cancelUrl: "https://l/payment-failed",
  notifyUrl: "https://api/api/billing/webhook",
};

function makeService(
  gateway: "test" | "bepaid",
  price: number | null = 9.99,
  current: unknown = null,
  bepaid = BEPAID_CFG
) {
  const subscriptionService = makeSubscriptionService(current);
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

/** Запись одного вызова fetch (url + распарсенное тело). */
interface FetchCall {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
}

/**
 * Мок fetch, маршрутизирующий ответ по URL+методу (см. `routes`).
 * Возвращает массив зафиксированных вызовов.
 */
function mockFetchRoutes(routes: (call: FetchCall) => unknown): {
  calls: FetchCall[];
  fn: ReturnType<typeof vi.fn>;
} {
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const call: FetchCall = {
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      body: init?.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : null,
    };
    calls.push(call);
    const body = routes(call);
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn };
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

  it("в bepaid-режиме создаёт план и подписку, возвращает redirectUrl", async () => {
    const { calls } = mockFetchRoutes((call) => {
      if (call.url.endsWith("/plans") && call.method === "GET") return { plans: [] };
      if (call.url.endsWith("/plans") && call.method === "POST") return { id: "pln_new" };
      if (call.url.endsWith("/subscriptions") && call.method === "POST")
        return { id: "sbs_1", state: "redirecting", redirect_url: "https://pay" };
      return {};
    });
    const { service, subscriptionService } = makeService("bepaid", 9.99);
    const result = await service.checkout(42, SubscriptionPlan.ProMonth);
    if (result.mode !== "redirect") throw new Error("ожидался redirect");
    expect(result.redirectUrl).toBe("https://pay");

    // План: сумма в минимальных единицах, валюта, интервал месяц.
    const planCall = calls.find((c) => c.url.endsWith("/plans") && c.method === "POST");
    const plan = (planCall?.body as { plan: Record<string, unknown> }).plan;
    expect(plan.amount).toBe(999);
    expect(plan.interval_unit).toBe("month");
    expect(plan.interval).toBe(1);
    expect((planCall?.body as { currency: string }).currency).toBe("BYN");

    // Подписка: привязана к плану, tracking_id вида "42-m".
    const subCall = calls.find(
      (c) => c.url.endsWith("/subscriptions") && c.method === "POST"
    );
    expect((subCall?.body as { plan: { id: string } }).plan.id).toBe("pln_new");
    expect((subCall?.body as { tracking_id: string }).tracking_id).toBe("42-m");

    // id подписки сохранён до подтверждения оплаты.
    expect(subscriptionService.setPendingBepaidSubscription).toHaveBeenCalledWith(42, {
      bepaidSubscriptionId: "sbs_1",
      bepaidPlanId: "pln_new",
    });
  });

  it("переиспользует существующий план bePaid по заголовку", async () => {
    const { calls } = mockFetchRoutes((call) => {
      if (call.url.endsWith("/plans") && call.method === "GET")
        return { plans: [{ id: "pln_exist", title: "fb-pro_month-999-BYN" }] };
      if (call.url.endsWith("/subscriptions") && call.method === "POST")
        return { id: "sbs_2", state: "redirecting", redirect_url: "https://pay" };
      return {};
    });
    const { service } = makeService("bepaid", 9.99);
    await service.checkout(42, SubscriptionPlan.ProMonth);
    // План не создаётся повторно (нет POST /plans).
    expect(calls.some((c) => c.url.endsWith("/plans") && c.method === "POST")).toBe(
      false
    );
    const subCall = calls.find((c) => c.url.endsWith("/subscriptions"));
    expect((subCall?.body as { plan: { id: string } }).plan.id).toBe("pln_exist");
  });

  it("отменяет прежнюю подписку bePaid перед созданием новой", async () => {
    const { calls } = mockFetchRoutes((call) => {
      if (call.url.endsWith("/plans") && call.method === "GET")
        return { plans: [{ id: "pln_x", title: "fb-pro_month-999-BYN" }] };
      if (call.url.endsWith("/subscriptions") && call.method === "POST")
        return { id: "sbs_new", state: "redirecting", redirect_url: "https://pay" };
      return {};
    });
    const { service } = makeService("bepaid", 9.99, {
      bepaidSubscriptionId: "sbs_old",
    });
    await service.checkout(42, SubscriptionPlan.ProMonth);
    expect(calls.some((c) => c.url.includes("/subscriptions/sbs_old/cancel"))).toBe(true);
  });

  it("бросает PaymentError, если bePaid не настроен", async () => {
    const { service } = makeService("bepaid", 9.99, null, { ...BEPAID_CFG, shopId: "" });
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

  it("активирует/продлевает подписку при состоянии active (срок = active_to)", async () => {
    mockFetchRoutes(() => ({
      id: "sbs_1",
      state: "active",
      tracking_id: "42-m",
      active_to: "2027-01-01T00:00:00Z",
      plan: { id: "pln_x" },
      last_transaction: { uid: "tx-777", status: "successful" },
    }));
    const { service, subscriptionService } = makeService("bepaid");
    const res = await service.handleNotify({ subscription: { id: "sbs_1" } });
    expect(res).toEqual({ received: true, activated: true });
    expect(subscriptionService.activatePaid).toHaveBeenCalledWith(
      42,
      SubscriptionPlan.ProMonth,
      {
        expiresAt: new Date("2027-01-01T00:00:00Z"),
        bepaidSubscriptionId: "sbs_1",
        bepaidPlanId: "pln_x",
        paymentId: "tx-777",
      }
    );
  });

  it("читает id подписки и из плоского тела webhook", async () => {
    mockFetchRoutes(() => ({
      id: "sbs_2",
      state: "active",
      tracking_id: "7-y",
      active_to: "2027-01-01T00:00:00Z",
      plan: { id: "pln_y" },
      last_transaction: { uid: "tx-9" },
    }));
    const { service, subscriptionService } = makeService("bepaid");
    const res = await service.handleNotify({ id: "sbs_2" });
    expect(res.activated).toBe(true);
    expect(subscriptionService.activatePaid).toHaveBeenCalledWith(
      7,
      SubscriptionPlan.ProYear,
      expect.objectContaining({ bepaidSubscriptionId: "sbs_2" })
    );
  });

  it("при состоянии canceled помечает подписку отменённой", async () => {
    mockFetchRoutes(() => ({
      id: "sbs_3",
      state: "canceled",
      tracking_id: "42-m",
    }));
    const { service, subscriptionService } = makeService("bepaid");
    const res = await service.handleNotify({ subscription: { id: "sbs_3" } });
    expect(res).toEqual({ received: true, activated: false });
    expect(subscriptionService.cancelByBepaidId).toHaveBeenCalledWith("sbs_3");
    expect(subscriptionService.activatePaid).not.toHaveBeenCalled();
  });

  it("не активирует без id подписки в теле webhook", async () => {
    const { fn } = mockFetchRoutes(() => ({}));
    const { service, subscriptionService } = makeService("bepaid");
    const res = await service.handleNotify({ subscription: {} });
    expect(res).toEqual({ received: true, activated: false });
    expect(fn).not.toHaveBeenCalled();
    expect(subscriptionService.activatePaid).not.toHaveBeenCalled();
  });

  it("игнорирует notify в test-режиме", async () => {
    const { service, subscriptionService } = makeService("test");
    const res = await service.handleNotify({ subscription: { id: "sbs_1" } });
    expect(res).toEqual({ received: true, activated: false });
    expect(subscriptionService.activatePaid).not.toHaveBeenCalled();
  });
});

describe("PaymentService.cancelSubscription", () => {
  it("отменяет подписку bePaid и помечает запись отменённой", async () => {
    const { calls } = mockFetchRoutes(() => ({ ok: true }));
    const { service, subscriptionService } = makeService("bepaid", 9.99, {
      bepaidSubscriptionId: "sbs_99",
    });
    await service.cancelSubscription(42);
    expect(calls.some((c) => c.url.includes("/subscriptions/sbs_99/cancel"))).toBe(true);
    expect(subscriptionService.cancel).toHaveBeenCalledWith(42);
  });

  it("без bePaid-подписки просто помечает запись отменённой", async () => {
    const { service, subscriptionService } = makeService("bepaid", 9.99, null);
    await service.cancelSubscription(42);
    expect(subscriptionService.cancel).toHaveBeenCalledWith(42);
  });
});
