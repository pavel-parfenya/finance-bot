import { Module } from "@nestjs/common";
import { AppStatsService } from "@finance-bot/server-core";
import { getApiContainer } from "../../di/api-container.context";
import { AdminController } from "./admin.controller";
import { AdminApiService } from "./admin-api.service";

@Module({
  controllers: [AdminController],
  providers: [
    {
      provide: AppStatsService,
      useFactory: () => getApiContainer().appStatsService,
    },
    AdminApiService,
  ],
})
export class AdminModule {}
