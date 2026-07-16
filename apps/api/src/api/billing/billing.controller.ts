import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { BillingJwtGuard } from "./billing-jwt.guard";
import { BepaidWebhookGuard } from "./bepaid-webhook.guard";
import { BillingUserParam } from "./billing-user.decorator";
import type { BillingUser } from "./billing-user.types";
import { BillingApiService } from "./billing-api.service";
import type { CheckoutDto } from "./dto/checkout.dto";

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
  checkout(
    @BillingUserParam() user: BillingUser,
    @Body() dto: CheckoutDto,
    @Req() req: Request
  ) {
    // IP/UA реального браузера — для матчинга серверных событий Meta CAPI.
    // За Cloudflare/nginx адрес клиента в X-Forwarded-For (первый в списке).
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ||
      req.ip;
    return this.billingApi.checkout(user, dto?.plan, {
      eventId: dto?.metaEventId,
      fbp: dto?.fbp,
      fbc: dto?.fbc,
      clientIpAddress: clientIp,
      clientUserAgent: req.headers["user-agent"],
    });
  }

  @Post("cancel")
  @UseGuards(BillingJwtGuard)
  cancel(@BillingUserParam() user: BillingUser) {
    return this.billingApi.cancel(user);
  }

  /**
   * Webhook платёжной системы bePaid. Аутентификация — Basic-подпись магазина
   * (BepaidWebhookGuard), а не billing-JWT. Подлинные нотификации отвечают 200;
   * поддельные отсекаются guard'ом (401) до обработки.
   */
  @Post("webhook")
  @HttpCode(200)
  @UseGuards(BepaidWebhookGuard)
  webhook(@Body() payload: unknown) {
    return this.billingApi.handleWebhook(payload);
  }
}
