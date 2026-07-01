import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { TelegramInitDataGuard } from "../telegram/telegram-init-data.guard";
import { TelegramUser } from "../telegram/telegram-user.decorator";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import { SubscriptionApiService } from "./subscription-api.service";

/**
 * Подписка для Mini App (Настройки → Подписка). Модуль подключается при
 * PAYMENT_MODE=paid|test (см. app.module), поэтому в free-режиме маршрут отсутствует.
 */
@Controller("subscription")
@UseGuards(TelegramInitDataGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionApi: SubscriptionApiService) {}

  @Get()
  getCurrent(@TelegramUser() user: ResolvedTelegramUser) {
    return this.subscriptionApi.getCurrent(user);
  }

  /** Тарифы из Strapi + текущий план и доступные фичи пользователя. */
  @Get("plans")
  getPlans(@TelegramUser() user: ResolvedTelegramUser) {
    return this.subscriptionApi.getPlansOverview(user);
  }

  /** Ссылка на оплату (лендинг /subscribe c billing-JWT) для открытия из Mini App. */
  @Post("checkout-link")
  getCheckoutLink(@TelegramUser() user: ResolvedTelegramUser) {
    return this.subscriptionApi.getCheckoutLink(user);
  }

  /** Отмена подписки (остановка автопродления); доступ сохраняется до конца периода. */
  @Post("cancel")
  cancel(@TelegramUser() user: ResolvedTelegramUser) {
    return this.subscriptionApi.cancel(user);
  }
}
