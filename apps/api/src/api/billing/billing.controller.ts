import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { BillingJwtGuard } from "./billing-jwt.guard";
import { BillingUserParam } from "./billing-user.decorator";
import type { BillingUser } from "./billing-user.types";
import { BillingApiService } from "./billing-api.service";
import type { CheckoutDto } from "./dto/checkout.dto";
import type { ChangePlanDto } from "./dto/change-plan.dto";

@Controller("billing")
export class BillingController {
  constructor(private readonly billingApi: BillingApiService) {}

  /** Лендинг /subscribe: пользователь + подписка по billing-JWT (?token=…). */
  @Get("me")
  @UseGuards(BillingJwtGuard)
  getMe(@BillingUserParam() user: BillingUser) {
    return this.billingApi.getMe(user);
  }

  @Get("subscription")
  @UseGuards(BillingJwtGuard)
  getSubscription(@BillingUserParam() user: BillingUser) {
    return this.billingApi.getSubscription(user);
  }

  @Post("checkout")
  @UseGuards(BillingJwtGuard)
  checkout(@BillingUserParam() user: BillingUser, @Body() dto: CheckoutDto) {
    return this.billingApi.checkout(user, dto?.plan);
  }

  @Post("change-plan")
  @UseGuards(BillingJwtGuard)
  changePlan(@BillingUserParam() user: BillingUser, @Body() dto: ChangePlanDto) {
    return this.billingApi.changePlan(user, dto?.plan);
  }

  @Post("cancel")
  @UseGuards(BillingJwtGuard)
  cancel(@BillingUserParam() user: BillingUser) {
    return this.billingApi.cancel(user);
  }

  /** Webhook платёжной системы (без JWT-guard). Реализация — Sprint 4. */
  @Post("webhook")
  @HttpCode(200)
  webhook(@Body() payload: unknown) {
    return this.billingApi.handleWebhook(payload);
  }
}
