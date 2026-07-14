import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import {
  APP_STATS_ACTIVE_HOURS,
  AppStatsService,
  config,
  PaymentService,
  UserService,
} from "@finance-bot/server-core";
import type { BepaidSubscriptionListItem } from "@finance-bot/server-core";
import type {
  AdminBepaidSubscriptionsResponse,
  AdminTelegramUserOption,
  AdminUndeliveredRecipient,
  AppUserStatsResponse,
} from "@finance-bot/shared";
import { TELEGRAM_OUTBOUND } from "../tokens";
import type { TelegramOutboundPort } from "../../di/telegram-outbound.port";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

const TELEGRAM_MESSAGE_MAX = 4096;

/** Восстанавливает локальный userId из tracking_id вида `<userId>-<code>`. */
function parseTrackingUserId(trackingId: string | null): number | null {
  if (!trackingId) return null;
  const first = trackingId.split("-")[0];
  const n = Number(first);
  return Number.isInteger(n) && n > 0 ? n : null;
}

@Injectable()
export class AdminApiService {
  constructor(
    private readonly userService: UserService,
    private readonly appStatsService: AppStatsService,
    private readonly paymentService: PaymentService,
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

  /** Текущее значение тумблера уведомлений об оплатах/отменах подписок. */
  async getSubscriptionNotifications(
    resolved: ResolvedTelegramUser
  ): Promise<{ enabled: boolean }> {
    await this.requireSuperAdmin(resolved);
    const user = await this.userService.findById(resolved.userId);
    return { enabled: user?.adminSubscriptionNotifications !== false };
  }

  async setSubscriptionNotifications(
    resolved: ResolvedTelegramUser,
    enabled: boolean
  ): Promise<{ ok: true; enabled: boolean }> {
    await this.requireSuperAdmin(resolved);
    await this.userService.setAdminSubscriptionNotifications(resolved.userId, enabled);
    return { ok: true, enabled };
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

  /**
   * Список подписок bePaid для супер-админа. Обогащает каждую подписку локальным
   * пользователем (по tracking_id). Ошибки обращения к bePaid возвращаются в поле
   * `error`, чтобы панель показала сообщение (доступ проверяется до запроса).
   */
  async getBepaidSubscriptions(
    resolved: ResolvedTelegramUser
  ): Promise<AdminBepaidSubscriptionsResponse> {
    await this.requireSuperAdmin(resolved);
    const gateway = config.paymentGateway;
    const testMode = config.bepaid.testMode;
    if (gateway !== "bepaid") {
      return { gateway, testMode, subscriptions: [] };
    }

    let items: BepaidSubscriptionListItem[];
    try {
      items = await this.paymentService.listBepaidSubscriptions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось загрузить подписки bePaid";
      return { gateway, testMode, subscriptions: [], error: msg };
    }

    const users = await this.userService.findAllOrderedById();
    const byId = new Map(users.map((u) => [u.id, u]));
    const subscriptions = items.map((it) => {
      const userId = parseTrackingUserId(it.trackingId);
      const user = userId != null ? byId.get(userId) : undefined;
      return {
        id: it.id,
        state: it.state,
        userId: userId ?? null,
        displayName: user
          ? this.personDisplayName(user.username, Number(user.telegramId))
          : null,
        planId: it.planId,
        planTitle: it.planTitle,
        amount: it.amountMinor != null ? it.amountMinor / 100 : null,
        currency: it.currency,
        cardLast4: it.cardLast4,
        lastTransactionStatus: it.lastTransactionStatus,
        createdAt: it.createdAt,
        activeTo: it.activeTo,
      };
    });
    return { gateway, testMode, subscriptions };
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
    params: {
      text: string;
      sendToAll: boolean;
      targetUserId?: number;
    }
  ): Promise<
    | {
        ok: true;
        sent?: number;
        failed?: number;
        undelivered?: AdminUndeliveredRecipient[];
      }
    | { error: string; undelivered?: AdminUndeliveredRecipient[] }
  > {
    await this.requireSuperAdmin(resolved);
    const trimmed = params.text.trim();
    if (!trimmed) return { error: "Введите текст сообщения" };
    if (trimmed.length > TELEGRAM_MESSAGE_MAX) {
      return { error: `Сообщение длиннее ${TELEGRAM_MESSAGE_MAX} символов` };
    }

    if (params.sendToAll) {
      const rows = await this.userService.findAllOrderedById();
      if (rows.length === 0) return { error: "Нет пользователей в базе" };
      let sent = 0;
      const undelivered: AdminUndeliveredRecipient[] = [];
      for (const row of rows) {
        const chatId = Number(row.telegramId);
        try {
          await this.telegram.sendMessage(chatId, trimmed);
          sent += 1;
        } catch {
          try {
            await this.userService.setArchived(row.id, true);
          } catch {
            /* не блокируем рассылку */
          }
          undelivered.push({
            userId: row.id,
            displayName: this.personDisplayName(row.username, chatId),
          });
        }
      }
      return {
        ok: true,
        sent,
        failed: undelivered.length,
        undelivered,
      };
    }

    const targetUserId = params.targetUserId ?? 0;
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      return { error: "Выберите пользователя" };
    }
    const target = await this.userService.findById(targetUserId);
    if (!target) return { error: "Пользователь не найден" };
    const chatId = Number(target.telegramId);
    try {
      await this.telegram.sendMessage(chatId, trimmed);
      return { ok: true, sent: 1, failed: 0 };
    } catch (e) {
      try {
        await this.userService.setArchived(targetUserId, true);
      } catch {
        /* */
      }
      const msg = e instanceof Error ? e.message : "Не удалось отправить";
      return {
        error: msg,
        undelivered: [
          {
            userId: targetUserId,
            displayName: this.personDisplayName(target.username, chatId),
          },
        ],
      };
    }
  }
}
