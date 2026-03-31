import { Inject, Injectable } from "@nestjs/common";
import { InlineKeyboard } from "grammy";
import type {
  CustomCategoryCreateRequest,
  CustomCategoryDto,
  CustomCategoryUpdateRequest,
} from "@finance-bot/shared";
import {
  INFO_CHANGELOG_VERSION,
  InvitationRepository,
  UserService,
  WorkspaceService,
  CustomCategoryService,
} from "@finance-bot/server-core";
import { TELEGRAM_OUTBOUND } from "../tokens";
import type { TelegramOutboundPort } from "../../di/telegram-outbound.port";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

@Injectable()
export class WorkspaceApiService {
  constructor(
    private readonly userService: UserService,
    private readonly workspaceService: WorkspaceService,
    private readonly invitationRepo: InvitationRepository,
    private readonly customCategoryService: CustomCategoryService,
    @Inject(TELEGRAM_OUTBOUND) private readonly telegram: TelegramOutboundPort
  ) {}

  async info(resolved: ResolvedTelegramUser) {
    const [seenVersion, workspace] = await Promise.all([
      this.userService.getInfoChangelogSeenVersion(resolved.userId),
      this.workspaceService.getWorkspaceForUser(resolved.userId),
    ]);

    if (!workspace) {
      return {
        isOwner: false,
        infoChangelogVersion: INFO_CHANGELOG_VERSION,
        infoChangelogSeenVersion: seenVersion,
      };
    }
    const isOwner = await this.workspaceService.isWorkspaceOwner(
      resolved.userId,
      workspace.id
    );
    const members = await this.workspaceService.getWorkspaceMembers(workspace.id);
    return {
      userId: resolved.userId,
      isOwner,
      members,
      infoChangelogVersion: INFO_CHANGELOG_VERSION,
      infoChangelogSeenVersion: seenVersion,
    };
  }

  async invite(
    resolved: ResolvedTelegramUser,
    username: string
  ): Promise<{ ok?: boolean; error?: string }> {
    const workspace = await this.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { error: "Workspace не найден" };

    const isOwner = await this.workspaceService.isWorkspaceOwner(
      resolved.userId,
      workspace.id
    );
    if (!isOwner) return { error: "Только владелец может приглашать участников" };

    const uname = username.replace(/^@/, "").trim();
    if (!uname) return { error: "Укажите @username" };

    const invitee = await this.userService.findByUsername(uname);
    if (!invitee) {
      return {
        error: `Пользователь @${uname} не найден. Он должен сначала написать боту /start.`,
      };
    }

    const existingInTarget = await this.workspaceService.getWorkspaceIdsForUser(
      invitee.id
    );
    if (existingInTarget.includes(workspace.id)) {
      return { error: "Этот пользователь уже в вашем workspace." };
    }

    try {
      const inv = await this.invitationRepo.create(
        workspace.id,
        resolved.userId,
        invitee.id
      );
      const invLoaded = await this.invitationRepo.findById(inv.id);
      const inviterName = invLoaded?.inviter?.username
        ? `@${invLoaded.inviter.username}`
        : "Владелец workspace";

      const kb = new InlineKeyboard()
        .text("Принять", `invite_accept:${inv.id}`)
        .text("Отклонить", `invite_decline:${inv.id}`);

      await this.telegram.sendMessage(
        Number(invitee.telegramId),
        `${inviterName} приглашает вас в общий учёт расходов.\n\nПринять приглашение?`,
        { reply_markup: kb }
      );
      return { ok: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Не удалось пригласить" };
    }
  }

  async setMemberFullAccess(
    resolved: ResolvedTelegramUser,
    targetUserId: number,
    fullAccess: boolean
  ): Promise<{ ok?: boolean; error?: string }> {
    const workspace = await this.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { error: "Workspace не найден" };

    const result = await this.workspaceService.setMemberFullAccess(
      workspace.id,
      resolved.userId,
      targetUserId,
      fullAccess
    );
    if (!result.ok) return { error: result.error };
    return { ok: true };
  }

  async getCustomCategories(
    resolved: ResolvedTelegramUser
  ): Promise<{ categories?: CustomCategoryDto[]; error?: string }> {
    const workspace = await this.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { categories: [] };

    const cats = await this.customCategoryService.getCategories(workspace.id);
    return {
      categories: cats.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        createdByUserId: c.createdByUserId,
        createdByUsername: c.createdBy?.username ?? null,
      })),
    };
  }

  async createCustomCategory(
    resolved: ResolvedTelegramUser,
    body: CustomCategoryCreateRequest
  ): Promise<{ category?: CustomCategoryDto; error?: string }> {
    const workspace = await this.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { error: "Workspace не найден" };

    try {
      const cat = await this.customCategoryService.createCategory(
        workspace.id,
        resolved.userId,
        body.name,
        body.description
      );
      return {
        category: {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          createdByUserId: cat.createdByUserId,
          createdByUsername: cat.createdBy?.username ?? null,
        },
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Ошибка создания" };
    }
  }

  async updateCustomCategory(
    resolved: ResolvedTelegramUser,
    categoryIdStr: string,
    body: CustomCategoryUpdateRequest
  ): Promise<{ category?: CustomCategoryDto; error?: string }> {
    const id = parseInt(categoryIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID" };

    const workspace = await this.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { error: "Workspace не найден" };

    const isOwner = await this.workspaceService.isWorkspaceOwner(
      resolved.userId,
      workspace.id
    );

    try {
      const cat = await this.customCategoryService.updateCategory(
        id,
        resolved.userId,
        isOwner,
        body
      );
      if (!cat) return { error: "Ошибка обновления" };
      return {
        category: {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          createdByUserId: cat.createdByUserId,
          createdByUsername: cat.createdBy?.username ?? null,
        },
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Ошибка обновления" };
    }
  }

  async deleteCustomCategory(
    resolved: ResolvedTelegramUser,
    categoryIdStr: string
  ): Promise<{ ok?: boolean; error?: string }> {
    const id = parseInt(categoryIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID" };

    const workspace = await this.workspaceService.getWorkspaceForUser(resolved.userId);
    if (!workspace) return { error: "Workspace не найден" };

    const isOwner = await this.workspaceService.isWorkspaceOwner(
      resolved.userId,
      workspace.id
    );

    try {
      await this.customCategoryService.deleteCategory(id, resolved.userId, isOwner);
      return { ok: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Ошибка удаления" };
    }
  }
}
