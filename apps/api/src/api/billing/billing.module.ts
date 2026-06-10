import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingApiService } from "./billing-api.service";
import { BillingJwtGuard } from "./billing-jwt.guard";

@Module({
  controllers: [BillingController],
  providers: [BillingApiService, BillingJwtGuard],
})
export class BillingModule {}
