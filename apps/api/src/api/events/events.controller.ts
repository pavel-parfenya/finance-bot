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
import type { EventCreateRequest, EventUpdateRequest } from "@finance-bot/shared";
import { TelegramInitDataGuard } from "../telegram/telegram-init-data.guard";
import { TelegramUser } from "../telegram/telegram-user.decorator";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import { EventsApiService } from "./events-api.service";

@Controller("events")
@UseGuards(TelegramInitDataGuard)
export class EventsController {
  constructor(private readonly eventsApi: EventsApiService) {}

  @Get()
  list(@TelegramUser() user: ResolvedTelegramUser) {
    return this.eventsApi.list(user);
  }

  @Post()
  create(@Body() body: EventCreateRequest, @TelegramUser() user: ResolvedTelegramUser) {
    return this.eventsApi.create(user, body);
  }

  @Get(":id")
  detail(@Param("id") id: string, @TelegramUser() user: ResolvedTelegramUser) {
    return this.eventsApi.detail(user, id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: EventUpdateRequest,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.eventsApi.update(user, id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @TelegramUser() user: ResolvedTelegramUser) {
    return this.eventsApi.remove(user, id);
  }

  @Post(":id/invite")
  invite(
    @Param("id") id: string,
    @Body() body: { username: string },
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.eventsApi.invite(user, id, body?.username ?? "");
  }

  @Post(":id/leave")
  leave(@Param("id") id: string, @TelegramUser() user: ResolvedTelegramUser) {
    return this.eventsApi.leave(user, id);
  }

  @Delete(":id/members/:userId")
  removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.eventsApi.removeMember(user, id, userId);
  }

  @Post(":id/transactions/link")
  linkTransaction(
    @Param("id") id: string,
    @Body() body: { transactionId: number },
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.eventsApi.linkTransaction(user, id, body?.transactionId);
  }

  @Delete(":id/transactions/:txId")
  deleteTransaction(
    @Param("id") id: string,
    @Param("txId") txId: string,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.eventsApi.deleteTransaction(user, id, txId);
  }

  @Post(":id/transactions/:txId/exclude")
  setExcluded(
    @Param("id") id: string,
    @Param("txId") txId: string,
    @Body() body: { excluded: boolean },
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.eventsApi.setExcluded(user, id, txId, body?.excluded ?? true);
  }

  @Post(":id/settle")
  settle(@Param("id") id: string, @TelegramUser() user: ResolvedTelegramUser) {
    return this.eventsApi.settle(user, id);
  }

  @Post(":id/settlement/debts")
  createDebt(
    @Param("id") id: string,
    @Body() body: { toUserId: number },
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.eventsApi.createDebt(user, id, body?.toUserId);
  }
}
