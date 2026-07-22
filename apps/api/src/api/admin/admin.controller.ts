import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { TelegramInitDataGuard } from "../telegram/telegram-init-data.guard";
import { TelegramUser } from "../telegram/telegram-user.decorator";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import type { AdminGiftSubscriptionPeriod } from "@finance-bot/shared";
import { AdminApiService } from "./admin-api.service";

const GIFT_PERIODS: AdminGiftSubscriptionPeriod[] = ["month", "year", "lifetime"];

@Controller("admin")
@UseGuards(TelegramInitDataGuard)
export class AdminController {
  constructor(private readonly adminApi: AdminApiService) {}

  @Get("telegram-users")
  async telegramUsers(@TelegramUser() user: ResolvedTelegramUser) {
    return this.adminApi.listTelegramUsers(user);
  }

  @Post("send-telegram-message")
  async sendTelegramMessage(
    @TelegramUser() user: ResolvedTelegramUser,
    @Body() body: { userId?: number; text?: string; sendToAll?: boolean }
  ) {
    return this.adminApi.sendTelegramMessageAsBot(user, {
      text: typeof body.text === "string" ? body.text : "",
      sendToAll: body.sendToAll === true,
      targetUserId: body.userId,
    });
  }

  @Post("grant-subscription")
  async grantSubscription(
    @TelegramUser() user: ResolvedTelegramUser,
    @Body() body: { userId?: number; period?: string }
  ) {
    const userId = Number(body.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return { error: "Выберите пользователя" };
    }
    if (!GIFT_PERIODS.includes(body.period as AdminGiftSubscriptionPeriod)) {
      return { error: "Укажите период подписки" };
    }
    return this.adminApi.grantSubscription(user, {
      targetUserId: userId,
      period: body.period as AdminGiftSubscriptionPeriod,
    });
  }

  @Get("bepaid-subscriptions")
  async bepaidSubscriptions(@TelegramUser() user: ResolvedTelegramUser) {
    return this.adminApi.getBepaidSubscriptions(user);
  }

  @Get("subscription-notifications")
  async subscriptionNotifications(@TelegramUser() user: ResolvedTelegramUser) {
    return this.adminApi.getSubscriptionNotifications(user);
  }

  @Post("subscription-notifications")
  async setSubscriptionNotifications(
    @TelegramUser() user: ResolvedTelegramUser,
    @Body() body: { enabled?: boolean }
  ) {
    return this.adminApi.setSubscriptionNotifications(user, body.enabled === true);
  }

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
