import jwt from "jsonwebtoken";

export interface BillingTokenPayload {
  telegramId: number;
  /** Момент выпуска токена (Unix seconds) — для отзыва после оплаты. */
  iat?: number;
}

/**
 * Подписывает/проверяет короткоживущие JWT для авторизации на лендинге.
 * Бот кладёт `telegramId` в токен и открывает ссылку `/subscribe?token=…`,
 * лендинг передаёт токен в API (`GET /billing/me?token=…`).
 */
export class BillingTokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = "1h"
  ) {}

  get isConfigured(): boolean {
    return this.secret.length > 0;
  }

  sign(telegramId: number): string {
    if (!this.isConfigured) {
      throw new Error("BILLING_JWT_SECRET не задан");
    }
    return jwt.sign({ telegramId }, this.secret, {
      expiresIn: this.expiresIn,
    } as jwt.SignOptions);
  }

  verify(token: string): BillingTokenPayload | null {
    if (!this.isConfigured || !token) return null;
    try {
      const decoded = jwt.verify(token, this.secret);
      if (
        typeof decoded === "object" &&
        decoded !== null &&
        typeof (decoded as { telegramId?: unknown }).telegramId === "number"
      ) {
        const obj = decoded as { telegramId: number; iat?: number };
        return { telegramId: obj.telegramId, iat: obj.iat };
      }
      return null;
    } catch {
      return null;
    }
  }
}
