declare global {
  namespace Express {
    interface Request {
      telegramUser?: import("../telegram/telegram-auth.types").ResolvedTelegramUser;
    }
  }
}

export {};
