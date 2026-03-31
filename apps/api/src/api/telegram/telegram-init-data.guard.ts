import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { TelegramAuthService } from "./telegram-auth.service";

@Injectable()
export class TelegramInitDataGuard implements CanActivate {
  constructor(private readonly telegramAuthService: TelegramAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const raw =
      (req.headers["x-telegram-init-data"] as string | undefined) ??
      (req.headers["x-init-data"] as string | undefined) ??
      "";
    const result = await this.telegramAuthService.resolveFromInitData(raw);
    if ("error" in result) {
      throw new HttpException({ error: result.error }, HttpStatus.UNAUTHORIZED);
    }
    req.telegramUser = result;
    return true;
  }
}
