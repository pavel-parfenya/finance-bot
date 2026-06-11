import { createHash } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
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

const WEBPAY_CFG: PaymentGatewayConfig["webpay"] = {
  storeId: "store-1",
  secretKey: "secret-xyz",
  formUrl: "https://payment.webpay.by",
  testMode: true,
  currency: "BYN",
  returnUrl: "https://l/payment-success",
  cancelUrl: "https://l/payment-failed",
  notifyUrl: "https://api/api/billing/webhook",
};

function makeService(
  gateway: "test" | "webpay",
  price: number | null = 9.99,
  webpay = WEBPAY_CFG
) {
  const subscriptionService = makeSubscriptionService();
  const planConfig = makePlanConfig(price);
  const service = new PaymentService(
    { gateway, webpay },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriptionService as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    planConfig as any
  );
  return { service, subscriptionService, planConfig };
}

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

  it("в webpay-режиме возвращает форму с подписанными полями", async () => {
    const { service } = makeService("webpay", 9.99);
    const result = await service.checkout(42, SubscriptionPlan.ProMonth);
    if (result.mode !== "webpay") throw new Error("ожидался webpay");
    expect(result.form.formUrl).toBe(WEBPAY_CFG.formUrl);
    expect(result.form.fields.wsb_order_num).toMatch(/^42-m-/);
    expect(result.form.fields.wsb_total).toBe("9.99");
    expect(result.form.fields.wsb_signature).toMatch(/^[a-f0-9]{32}$/);
  });

  it("бросает PaymentError, если WebPay не настроен", async () => {
    const { service } = makeService("webpay", 9.99, { ...WEBPAY_CFG, storeId: "" });
    await expect(service.checkout(1, SubscriptionPlan.ProMonth)).rejects.toBeInstanceOf(
      PaymentError
    );
  });

  it("бросает PaymentError, если цена тарифа не задана", async () => {
    const { service } = makeService("webpay", null);
    await expect(service.checkout(1, SubscriptionPlan.ProMonth)).rejects.toBeInstanceOf(
      PaymentError
    );
  });
});

/** Считает подпись notify так же, как verifyNotifySignature. */
function notifySignature(fields: Record<string, string>, secret: string): string {
  const raw =
    fields.batch_timestamp +
    fields.currency_id +
    fields.amount +
    fields.payment_method +
    fields.order_id +
    fields.site_order_id +
    fields.transaction_id +
    fields.payment_type +
    fields.rrn +
    secret;
  return createHash("md5").update(raw, "utf8").digest("hex");
}

describe("PaymentService.handleNotify", () => {
  function buildPayload(orderId: string): Record<string, string> {
    const base: Record<string, string> = {
      batch_timestamp: "1700000000",
      currency_id: "BYN",
      amount: "9.99",
      payment_method: "cc",
      order_id: orderId,
      site_order_id: "",
      transaction_id: "tx-777",
      payment_type: "1",
      rrn: "rrn-1",
    };
    return { ...base, wsb_signature: notifySignature(base, WEBPAY_CFG.secretKey) };
  }

  it("активирует подписку при валидной подписи", async () => {
    const { service, subscriptionService } = makeService("webpay");
    const res = await service.handleNotify(buildPayload("42-m-abc"));
    expect(res).toEqual({ received: true, activated: true });
    expect(subscriptionService.activatePaid).toHaveBeenCalledWith(
      42,
      SubscriptionPlan.ProMonth,
      { webpayOrderId: "42-m-abc", paymentId: "tx-777" }
    );
  });

  it("не активирует при неверной подписи", async () => {
    const { service, subscriptionService } = makeService("webpay");
    const payload = buildPayload("42-m-abc");
    payload.wsb_signature = "deadbeef";
    const res = await service.handleNotify(payload);
    expect(res).toEqual({ received: true, activated: false });
    expect(subscriptionService.activatePaid).not.toHaveBeenCalled();
  });

  it("игнорирует notify в test-режиме", async () => {
    const { service, subscriptionService } = makeService("test");
    const res = await service.handleNotify(buildPayload("42-m-abc"));
    expect(res).toEqual({ received: true, activated: false });
    expect(subscriptionService.activatePaid).not.toHaveBeenCalled();
  });
});
