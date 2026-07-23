import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsApiService } from "./events-api.service";

@Module({
  controllers: [EventsController],
  providers: [EventsApiService],
})
export class EventsModule {}
