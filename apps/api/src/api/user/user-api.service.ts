import { Injectable } from "@nestjs/common";
import { INFO_CHANGELOG_VERSION, UserService } from "@finance-bot/server-core";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

@Injectable()
export class UserApiService {
  constructor(private readonly userService: UserService) {}

  async getSettings(resolved: ResolvedTelegramUser) {
    const [defaultCurrency, analyticsEnabled, analyticsVoice] = await Promise.all([
      this.userService.getDefaultCurrency(resolved.userId),
      this.userService.getAnalyticsEnabled(resolved.userId),
      this.userService.getAnalyticsVoice(resolved.userId),
    ]);

    return {
      defaultCurrency: defaultCurrency ?? null,
      analyticsEnabled,
      analyticsVoice: analyticsVoice ?? "official",
    };
  }

  async updateSettings(
    resolved: ResolvedTelegramUser,
    updates: {
      defaultCurrency?: string | null;
      analyticsEnabled?: boolean;
      analyticsVoice?: string;
    }
  ) {
    await this.userService.updateUserSettings(resolved.userId, updates);
    return { ok: true };
  }

  async markInfoChangelogSeen(resolved: ResolvedTelegramUser) {
    await this.userService.markInfoChangelogSeen(resolved.userId, INFO_CHANGELOG_VERSION);
    return { ok: true };
  }
}
