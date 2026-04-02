import { ForbiddenException, Injectable } from "@nestjs/common";
import {
  APP_STATS_ACTIVE_HOURS,
  AppStatsService,
  config,
  UserService,
} from "@finance-bot/server-core";
import type { AppUserStatsResponse } from "@finance-bot/shared";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

@Injectable()
export class AdminApiService {
  constructor(
    private readonly userService: UserService,
    private readonly appStatsService: AppStatsService
  ) {}

  async requireSuperAdmin(resolved: ResolvedTelegramUser): Promise<void> {
    const envName = config.superAdminUsername;
    if (!envName?.trim()) {
      throw new ForbiddenException({ error: "Супер-админ не настроен" });
    }
    const user = await this.userService.findById(resolved.userId);
    const uname = (user?.username ?? "").replace(/^@/, "").toLowerCase();
    if (!uname || uname !== envName.toLowerCase()) {
      throw new ForbiddenException({ error: "Нет доступа" });
    }
  }

  async getAppUserStats(fromDate: string, toDate: string): Promise<AppUserStatsResponse> {
    await this.appStatsService.ensureSnapshotsForRange(fromDate, toDate);
    const [current, series] = await Promise.all([
      this.appStatsService.getStats(),
      this.appStatsService.getSnapshotSeries(fromDate, toDate),
    ]);
    return {
      current,
      series,
      activeWindowHours: APP_STATS_ACTIVE_HOURS,
    };
  }
}
