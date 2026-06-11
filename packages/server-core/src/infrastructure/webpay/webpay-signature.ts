import { createHash } from "node:crypto";

/** Поля для подписи формы запроса оплаты (`wsb_signature`). */
export interface RequestSignatureFields {
  seed: string;
  storeId: string;
  orderNum: string;
  testMode: string;
  currency: string;
  total: string;
}

/** Поля уведомления (notify-url) от WebPay для проверки подписи. */
export interface NotifySignatureFields {
  batchTimestamp: string;
  currencyId: string;
  amount: string;
  paymentMethod: string;
  orderId: string;
  siteOrderId: string;
  transactionId: string;
  paymentType: string;
  rrn: string;
  signature: string;
}

/**
 * Подпись формы запроса оплаты WebPay (поле `wsb_signature`).
 * Поля конкатенируются в строго определённом порядке + секретный ключ магазина, MD5.
 *
 * Конкретный формат может уточняться в договоре с банком; функции принимают порядок полей
 * параметром, чтобы было легко подменить под актуальную спецификацию.
 */
export function buildRequestSignature(
  fields: RequestSignatureFields,
  secretKey: string
): string {
  const raw =
    fields.seed +
    fields.storeId +
    fields.orderNum +
    fields.testMode +
    fields.currency +
    fields.total +
    secretKey;
  return md5(raw);
}

/**
 * Подпись уведомления (notify-url / webhook) от WebPay.
 * Состав полей и порядок зафиксированы документацией WebPay.
 */
export function verifyNotifySignature(
  fields: NotifySignatureFields,
  secretKey: string
): boolean {
  const expected = md5(
    fields.batchTimestamp +
      fields.currencyId +
      fields.amount +
      fields.paymentMethod +
      fields.orderId +
      fields.siteOrderId +
      fields.transactionId +
      fields.paymentType +
      fields.rrn +
      secretKey
  );
  return constantTimeEqual(expected, fields.signature.toLowerCase());
}

function md5(input: string): string {
  return createHash("md5").update(input, "utf8").digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
