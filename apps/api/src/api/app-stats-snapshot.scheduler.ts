import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import cron, { type ScheduledTask } from "node-cron";
import { AppStatsService, config } from "@finance-bot/server-core";

@Injectable()
export class AppStatsSnapshotScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AppStatsSnapshotScheduler.name);
  private task: ScheduledTask | null = null;

  constructor(private readonly appStats: AppStatsService) {}

  onModuleInit(): void {
    if (config.apiMode === "test") {
      this.log.log("API_MODE=test — cron снимков app-user-stats отключён.");
      return;
    }
    this.task = cron.schedule(
      "59 23 * * *",
      () => {
        void this.run();
      },
      { timezone: "UTC" }
    );
    this.log.log("Снимки app-user-stats: ежедневно в 23:59 UTC.");
  }

  onModuleDestroy(): void {
    this.task?.stop();
    this.task = null;
  }

  private async run(): Promise<void> {
    try {
      await this.appStats.recordTodayUtcDaySnapshotScheduled();
      this.log.log("Снимок app-user-stats за текущий UTC-день записан.");
    } catch (e) {
      this.log.error(e instanceof Error ? e.message : e);
    }
  }
}
