import { Module } from "@nestjs/common";
import { DebtsController } from "./debts.controller";
import { DebtsApiService } from "./debts-api.service";

@Module({
  controllers: [DebtsController],
  providers: [DebtsApiService],
})
export class DebtsModule {}
