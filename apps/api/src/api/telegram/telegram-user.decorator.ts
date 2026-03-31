import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { ResolvedTelegramUser } from "./telegram-auth.types";

export const TelegramUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedTelegramUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.telegramUser;
    if (!user) {
      throw new Error("TelegramInitDataGuard must run before @TelegramUser()");
    }
    return user;
  }
);
