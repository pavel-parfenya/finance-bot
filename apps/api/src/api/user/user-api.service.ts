import { Injectable } from "@nestjs/common";
import {
  config,
  DEFAULT_ANALYTICS_TIMEZONE,
  INFO_CHANGELOG_VERSION,
  UserService,
} from "@finance-bot/server-core";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

@Injectable()
export class UserApiService {
  constructor(private readonly userService: UserService) {}

  async getSettings(resolved: ResolvedTelegramUser) {
    const [defaultCurrency, user] = await Promise.all([
      this.userService.getDefaultCurrency(resolved.userId),
      this.userService.findById(resolved.userId),
    ]);

    const superName = config.superAdminUsername;
    const uname = (user?.username ?? "").replace(/^@/, "").toLowerCase();
    const isSuperAdmin = !!(superName && uname && uname === superName.toLowerCase());

    return {
      defaultCurrency: defaultCurrency ?? null,
      analyticsReminderEod: user?.analyticsReminderEod ?? false,
      analyticsMonthReport: user?.analyticsMonthReport ?? false,
      analyticsForecastWeekly: user?.analyticsForecastWeekly ?? false,
      analyticsTimezone: user?.analyticsTimezone?.trim() || DEFAULT_ANALYTICS_TIMEZONE,
      analyticsVoice: await this.userService.getAnalyticsVoice(resolved.userId),
      isSuperAdmin,
    };
  }

  async updateSettings(
    resolved: ResolvedTelegramUser,
    updates: {
      defaultCurrency?: string | null;
      analyticsReminderEod?: boolean;
      analyticsMonthReport?: boolean;
      analyticsForecastWeekly?: boolean;
      analyticsTimezone?: string | null;
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
