import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { TelegramInitDataGuard } from "../telegram/telegram-init-data.guard";
import { TelegramUser } from "../telegram/telegram-user.decorator";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import { AdminApiService } from "./admin-api.service";

@Controller("admin")
@UseGuards(TelegramInitDataGuard)
export class AdminController {
  constructor(private readonly adminApi: AdminApiService) {}

  @Get("app-user-stats")
  async appUserStats(
    @TelegramUser() user: ResolvedTelegramUser,
    @Query("from") from: string,
    @Query("to") to: string
  ) {
    await this.adminApi.requireSuperAdmin(user);
    if (!from?.trim() || !to?.trim()) {
      return { error: "Укажите from и to (YYYY-MM-DD)" };
    }
    try {
      return await this.adminApi.getAppUserStats(from.trim(), to.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { error: msg };
    }
  }
}
