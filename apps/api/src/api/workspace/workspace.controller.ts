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
import type {
  CustomCategoryCreateRequest,
  CustomCategoryUpdateRequest,
} from "@finance-bot/shared";
import { TelegramInitDataGuard } from "../telegram/telegram-init-data.guard";
import { TelegramUser } from "../telegram/telegram-user.decorator";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";
import { WorkspaceApiService } from "./workspace-api.service";

@Controller("workspace")
@UseGuards(TelegramInitDataGuard)
export class WorkspaceController {
  constructor(private readonly workspaceApi: WorkspaceApiService) {}

  @Get("info")
  info(@TelegramUser() user: ResolvedTelegramUser) {
    return this.workspaceApi.info(user);
  }

  @Post("invite")
  invite(
    @Body() body: { username?: string },
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.workspaceApi.invite(user, body.username ?? "");
  }

  @Patch("member/:userId/full-access")
  setMemberFullAccess(
    @Param("userId") userIdParam: string,
    @Body() body: { fullAccess?: boolean },
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    const targetUserId = parseInt(userIdParam, 10);
    return this.workspaceApi.setMemberFullAccess(
      user,
      targetUserId,
      body.fullAccess === true
    );
  }

  @Get("categories")
  getCategories(@TelegramUser() user: ResolvedTelegramUser) {
    return this.workspaceApi.getCustomCategories(user);
  }

  @Post("categories")
  createCategory(
    @Body() body: CustomCategoryCreateRequest,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.workspaceApi.createCustomCategory(user, body);
  }

  @Patch("categories/:id")
  updateCategory(
    @Param("id") id: string,
    @Body() body: CustomCategoryUpdateRequest,
    @TelegramUser() user: ResolvedTelegramUser
  ) {
    return this.workspaceApi.updateCustomCategory(user, id, body);
  }

  @Delete("categories/:id")
  deleteCategory(@Param("id") id: string, @TelegramUser() user: ResolvedTelegramUser) {
    return this.workspaceApi.deleteCustomCategory(user, id);
  }
}
