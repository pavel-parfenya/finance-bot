import { Context } from "grammy";
import { User } from "../database/entities";
import { UserService } from "../services/user-service";
import { WorkspaceService } from "../services/workspace-service";
import { Workspace } from "../database/entities";

export function getUserDisplayName(ctx: Context): string {
  const from = ctx.from;
  if (!from) return "Неизвестный";

  if (from.first_name && from.last_name) {
    return `${from.first_name} ${from.last_name}`;
  }

  return from.first_name || from.username || "Неизвестный";
}

export async function resolveUser(
  ctx: Context,
  userService: UserService
): Promise<User | null> {
  const from = ctx.from;
  if (!from) return null;

  return userService.findOrCreate(from.id, from.username ?? null);
}

/** Требует workspace пользователя. */
export async function requireWorkspace(
  ctx: Context,
  user: User,
  workspaceService: WorkspaceService
): Promise<Workspace | null> {
  const workspace = await workspaceService.getOrCreateWorkspaceForUser(user.id);
  return workspace;
}
