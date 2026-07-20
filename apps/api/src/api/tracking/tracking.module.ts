import { Module } from "@nestjs/common";
import { TrackingController } from "./tracking.controller";
import { TrackingApiService } from "./tracking-api.service";

@Module({
  controllers: [TrackingController],
  providers: [TrackingApiService],
})
export class TrackingModule {}
