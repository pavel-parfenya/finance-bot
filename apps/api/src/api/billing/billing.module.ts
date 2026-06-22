import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingApiService } from "./billing-api.service";
import { BillingJwtGuard } from "./billing-jwt.guard";
import { BepaidWebhookGuard } from "./bepaid-webhook.guard";

@Module({
  controllers: [BillingController],
  providers: [BillingApiService, BillingJwtGuard, BepaidWebhookGuard],
})
export class BillingModule {}
