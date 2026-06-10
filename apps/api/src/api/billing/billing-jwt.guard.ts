import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { BillingTokenService, UserService } from "@finance-bot/server-core";

/** Достаёт токен из `Authorization: Bearer …` или из query `?token=…`. */
function extractToken(req: Request): string {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  const queryToken = req.query?.token;
  if (typeof queryToken === "string") return queryToken;
  return "";
}

@Injectable()
export class BillingJwtGuard implements CanActivate {
  constructor(
    private readonly billingTokenService: BillingTokenService,
    private readonly userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractToken(req);
    const payload = this.billingTokenService.verify(token);
    if (!payload) {
      throw new HttpException(
        { error: "Недействительный или истёкший токен" },
        HttpStatus.UNAUTHORIZED
      );
    }

    const user = await this.userService.findOneByTelegramId(payload.telegramId);
    if (!user) {
      throw new HttpException(
        { error: "Пользователь не найден. Добавьте расходы в боте." },
        HttpStatus.UNAUTHORIZED
      );
    }

    req.billingUser = {
      userId: user.id,
      telegramId: payload.telegramId,
      username: user.username,
    };
    return true;
  }
}
