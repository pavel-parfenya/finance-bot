import { randomBytes } from "node:crypto";
import { buildRequestSignature } from "./webpay-signature";

/** Конфигурация магазина WebPay + сервисные URL. */
export interface WebpayConfig {
  storeId: string;
  secretKey: string;
  formUrl: string;
  testMode: boolean;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

/** Данные одного платежа. */
export interface PaymentInput {
  orderNum: string;
  amount: string;
  currency: string;
  description: string;
  email?: string;
}

/** Готовая форма для редиректа на WebPay. */
export interface PaymentForm {
  formUrl: string;
  fields: Record<string, string>;
}

/**
 * Готовит поля HTML-формы для редиректа на WebPay.
 * Лендинг создаёт form action=formUrl, кладёт fields как hidden inputs, submit.
 */
export function buildPaymentForm(config: WebpayConfig, input: PaymentInput): PaymentForm {
  const seed = randomBytes(16).toString("hex");
  const testMode = config.testMode ? "1" : "0";
  const signature = buildRequestSignature(
    {
      seed,
      storeId: config.storeId,
      orderNum: input.orderNum,
      testMode,
      currency: input.currency,
      total: input.amount,
    },
    config.secretKey
  );
  return {
    formUrl: config.formUrl,
    fields: {
      "*scart": "",
      wsb_storeid: config.storeId,
      wsb_order_num: input.orderNum,
      wsb_currency_id: input.currency,
      wsb_total: input.amount,
      wsb_test: testMode,
      wsb_invoice_item_name: input.description,
      wsb_invoice_item_quantity: "1",
      wsb_invoice_item_price: input.amount,
      wsb_seed: seed,
      wsb_signature: signature,
      wsb_return_url: config.returnUrl,
      wsb_cancel_return_url: config.cancelUrl,
      wsb_notify_url: config.notifyUrl,
      ...(input.email ? { wsb_email: input.email } : {}),
      wsb_language_id: "russian",
    },
  };
}
