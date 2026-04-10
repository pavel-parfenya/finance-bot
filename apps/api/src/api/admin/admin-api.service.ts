import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  APP_STATS_ACTIVE_HOURS,
  AppStatsService,
  config,
  UserService,
} from "@finance-bot/server-core";
import type { AdminTelegramUserOption, AppUserStatsResponse } from "@finance-bot/shared";
import { TELEGRAM_OUTBOUND } from "../tokens";
import type { TelegramOutboundPort } from "../../di/telegram-outbound.port";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

const TELEGRAM_MESSAGE_MAX = 4096;

@Injectable()
export class AdminApiService {
  constructor(
    private readonly userService: UserService,
    private readonly appStatsService: AppStatsService,
    @Inject(TELEGRAM_OUTBOUND) private readonly telegram: TelegramOutboundPort
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

  private personDisplayName(
    username: string | null | undefined,
    telegramId: number
  ): string {
    const u = username?.replace(/^@/, "").trim();
    if (u) return `@${u}`;
    return `Пользователь ${telegramId}`;
  }

  async listTelegramUsers(resolved: ResolvedTelegramUser): Promise<{
    users: AdminTelegramUserOption[];
  }> {
    await this.requireSuperAdmin(resolved);
    const rows = await this.userService.findAllOrderedById();
    const users: AdminTelegramUserOption[] = rows.map((r) => {
      const tid = Number(r.telegramId);
      return {
        userId: r.id,
        telegramId: tid,
        username: r.username ?? null,
        displayName: this.personDisplayName(r.username, tid),
      };
    });
    return { users };
  }

  async sendTelegramMessageAsBot(
    resolved: ResolvedTelegramUser,
    targetUserId: number,
    text: string
  ): Promise<{ ok: true } | { error: string }> {
    await this.requireSuperAdmin(resolved);
    const trimmed = text.trim();
    if (!trimmed) return { error: "Введите текст сообщения" };
    if (trimmed.length > TELEGRAM_MESSAGE_MAX) {
      return { error: `Сообщение длиннее ${TELEGRAM_MESSAGE_MAX} символов` };
    }
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      return { error: "Выберите пользователя" };
    }
    const target = await this.userService.findById(targetUserId);
    if (!target) return { error: "Пользователь не найден" };
    const chatId = Number(target.telegramId);
    try {
      await this.telegram.sendMessage(chatId, trimmed);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось отправить";
      return { error: msg };
    }
  }
}
