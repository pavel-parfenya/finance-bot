declare global {
  namespace Express {
    interface Request {
      telegramUser?: import("../telegram/telegram-auth.types").ResolvedTelegramUser;
      billingUser?: import("../billing/billing-user.types").BillingUser;
    }
  }
}

export {};
