import { Module } from "@nestjs/common";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionApiService } from "./subscription-api.service";

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionApiService],
})
export class SubscriptionModule {}
