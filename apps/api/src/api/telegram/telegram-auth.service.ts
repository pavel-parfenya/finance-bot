import { Inject, Injectable } from "@nestjs/common";
import { validate, parse, deepSnakeToCamelObjKeys } from "@tma.js/init-data-node";
import { UserService, WorkspaceService } from "@finance-bot/server-core";
import { AppConfigService } from "../app-config/app-config.service";
import { BOT_TOKEN } from "../tokens";
import type { ResolvedTelegramUser, ResolveUserError } from "./telegram-auth.types";

@Injectable()
export class TelegramAuthService {
  constructor(
    private readonly userService: UserService,
    private readonly workspaceService: WorkspaceService,
    private readonly appConfig: AppConfigService,
    @Inject(BOT_TOKEN) private readonly botToken: string
  ) {}

  async resolveFromInitData(
    initDataRaw: string
  ): Promise<ResolvedTelegramUser | ResolveUserError> {
    if (this.appConfig.isTestApiAuth) {
      const telegramId = this.appConfig.testTelegramUserId!;
      return this.resolveByTelegramId(telegramId);
    }

    if (!initDataRaw?.trim()) {
      return { error: "Отсутствуют данные авторизации Telegram" };
    }
    try {
      validate(initDataRaw, this.botToken);
    } catch {
      return { error: "Недействительная сессия. Откройте приложение заново." };
    }
    const parsed = deepSnakeToCamelObjKeys(parse(initDataRaw)) as {
      user?: { id: number; firstName?: string; username?: string };
    };
    const telegramId = parsed?.user?.id;
    if (!telegramId) return { error: "Пользователь не найден в данных Telegram" };
    const user = await this.userService.findOneByTelegramId(telegramId);
    if (!user) {
      return { error: "Пользователь не зарегистрирован. Добавьте расходы в боте." };
    }
    const creatorDisplayName =
      parsed?.user?.firstName ||
      (parsed?.user?.username ? `@${parsed.user.username}` : "Пользователь");
    return this.buildResolvedUser(user.id, creatorDisplayName);
  }

  private async resolveByTelegramId(
    telegramId: number
  ): Promise<ResolvedTelegramUser | ResolveUserError> {
    const user = await this.userService.findOneByTelegramId(telegramId);
    if (!user) {
      return {
        error:
          "Пользователь с таким TELEGRAM_USER_ID не найден в БД. Добавьте расходы в боте или поправьте id.",
      };
    }
    const creatorDisplayName = user.username
      ? `@${user.username}`
      : "Пользователь (test)";
    return this.buildResolvedUser(user.id, creatorDisplayName);
  }

  private async buildResolvedUser(
    userId: number,
    creatorDisplayName: string
  ): Promise<ResolvedTelegramUser> {
    const workspaceIds = await this.workspaceService.getWorkspaceIdsForUser(userId);
    const fullAccessWorkspaceIds: number[] = [];
    for (const wid of workspaceIds) {
      const hasAccess = await this.workspaceService.getMemberFullAccess(wid, userId);
      if (hasAccess) fullAccessWorkspaceIds.push(wid);
    }
    return {
      userId,
      workspaceIds,
      creatorDisplayName,
      fullAccessWorkspaceIds,
    };
  }
}
