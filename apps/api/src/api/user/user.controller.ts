import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { TelegramInitDataGuard } from "../telegram/telegram-init-data.guard";
import { TelegramUser } from "../telegram/telegram-user.decorator";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import { UserApiService } from "./user-api.service";

@Controller("user")
@UseGuards(TelegramInitDataGuard)
export class UserController {
  constructor(private readonly userApi: UserApiService) {}

  @Get("settings")
  getSettings(@TelegramUser() user: ResolvedTelegramUser) {
    return this.userApi.getSettings(user);
  }

  @Patch("settings")
  updateSettings(
    @Body()
    updates: {
      defaultCurrency?: string | null;
      analyticsEnabled?: boolean;
      analyticsVoice?: string;
    },
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.userApi.updateSettings(user, updates);
  }

  @Post("info-changelog-seen")
  markSeen(@TelegramUser() user: ResolvedTelegramUser) {
    return this.userApi.markInfoChangelogSeen(user);
  }
}
