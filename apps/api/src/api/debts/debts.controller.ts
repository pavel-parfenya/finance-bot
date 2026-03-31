import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { DebtCreateRequest, DebtUpdateRequest } from "@finance-bot/shared";
import { TelegramInitDataGuard } from "../telegram/telegram-init-data.guard";
import { TelegramUser } from "../telegram/telegram-user.decorator";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import { DebtsApiService } from "./debts-api.service";

@Controller("debts")
@UseGuards(TelegramInitDataGuard)
export class DebtsController {
  constructor(private readonly debtsApi: DebtsApiService) {}

  @Get()
  list(@TelegramUser() user: ResolvedTelegramUser) {
    return this.debtsApi.list(user);
  }

  @Post()
  create(@Body() body: DebtCreateRequest, @TelegramUser() user: ResolvedTelegramUser) {
    return this.debtsApi.create(user, body);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: DebtUpdateRequest,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.debtsApi.update(user, id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @TelegramUser() user: ResolvedTelegramUser) {
    return this.debtsApi.remove(user, id);
  }
}
