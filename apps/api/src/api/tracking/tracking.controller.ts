import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { TrackingApiService } from "./tracking-api.service";
import type { PageViewDto } from "./dto/pageview.dto";

/**
 * Meta CAPI: события, отправляемые для анонимных посетителей лендинга
 * (до логина/оплаты), поэтому без billing-JWT — в отличие от /api/billing/*.
 */
@Controller("tracking")
export class TrackingController {
  constructor(private readonly trackingApi: TrackingApiService) {}

  @Post("pageview")
  @HttpCode(200)
  pageView(@Body() dto: PageViewDto, @Req() req: Request) {
    // IP/UA реального браузера — за Cloudflare/nginx адрес в X-Forwarded-For (первый в списке).
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ||
      req.ip;
    return this.trackingApi.pageView(dto, clientIp, req.headers["user-agent"]);
  }
}
