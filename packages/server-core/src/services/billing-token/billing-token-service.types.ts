export interface BillingTokenPayload {
  telegramId: number;
  /** Момент выпуска токена (Unix seconds) — для отзыва после оплаты. */
  iat?: number;
}
