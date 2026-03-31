import {
  Controller,
  Delete,
  Get,
  Patch,
  Query,
  UseGuards,
  Param,
  Body,
} from "@nestjs/common";
import type { TransactionFilters, TransactionUpdateRequest } from "@finance-bot/shared";
import { TelegramInitDataGuard } from "../telegram/telegram-init-data.guard";
import { TelegramUser } from "../telegram/telegram-user.decorator";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import { TransactionsService } from "./transactions.service";

function parseTransactionFilters(q: Record<string, string | string[] | undefined>): {
  filters: TransactionFilters | undefined;
} {
  const period = String(q["period"] ?? "");
  const startDate = String(q["startDate"] ?? "");
  const endDate = String(q["endDate"] ?? "");
  const category = String(q["category"] ?? "");
  const currency = String(q["currency"] ?? "");
  const userIdParam = q["userId"] != null ? String(q["userId"]) : "";
  const typeParam = q["type"] != null ? String(q["type"]) : "";
  const search = String(q["search"] ?? "");
  const limitParam = q["limit"] != null ? String(q["limit"]) : "";
  const offsetParam = q["offset"] != null ? String(q["offset"]) : "";
  const userIdNum = userIdParam ? parseInt(userIdParam, 10) : 0;
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
  const filters =
    period ||
    category ||
    currency ||
    (userIdParam && !isNaN(userIdNum)) ||
    typeParam === "expense" ||
    typeParam === "income" ||
    search ||
    limit !== undefined ||
    offset !== undefined
      ? {
          period: period || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          category: category || undefined,
          currency: currency || undefined,
          userId: userIdParam && !isNaN(userIdNum) ? userIdNum : undefined,
          type:
            typeParam === "expense" || typeParam === "income"
              ? (typeParam as "expense" | "income")
              : undefined,
          search: search || undefined,
          limit,
          offset,
        }
      : undefined;
  return { filters };
}

@Controller("transactions")
@UseGuards(TelegramInitDataGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async list(
    @Query() query: Record<string, string | string[] | undefined>,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    const { filters } = parseTransactionFilters(query);
    return this.transactionsService.list(user, filters);
  }

  @Get("categories")
  async categories(@TelegramUser() user: ResolvedTelegramUser) {
    return this.transactionsService.categories(user);
  }

  @Get("analytics")
  async analytics(
    @Query("period") periodType: string | undefined,
    @Query("startDate") startDate: string | undefined,
    @Query("endDate") endDate: string | undefined,
    @Query("userId") userIdParam: string | undefined,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    const period = periodType ?? "current";
    const userIdNum = userIdParam ? parseInt(userIdParam, 10) : undefined;
    return this.transactionsService.analytics(
      user,
      period,
      startDate || undefined,
      endDate || undefined,
      userIdNum && !isNaN(userIdNum) ? userIdNum : undefined
    );
  }

  @Patch(":id")
  async patch(
    @Param("id") id: string,
    @Body() updates: Record<string, unknown>,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    const body = updates as TransactionUpdateRequest;
    return this.transactionsService.update(user, id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @TelegramUser() user: ResolvedTelegramUser) {
    return this.transactionsService.remove(user, id);
  }
}
