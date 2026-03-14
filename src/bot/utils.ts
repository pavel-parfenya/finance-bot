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

/** Требует workspace с подключённой таблицей (для /invite и т.п.). */
export async function requireWorkspaceWithSheet(
  ctx: Context,
  user: User,
  workspaceService: WorkspaceService
): Promise<Workspace | null> {
  const workspace = await workspaceService.getWorkspaceForUser(user.id);
  if (!workspace || !workspaceService.hasSheet(workspace)) {
    await ctx.reply(
      "Сначала подключите таблицу через /link.\n\n" + "Нажмите /start или /help."
    );
    return null;
  }
  return workspace;
}

const SHEET_URL_RE = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

export function extractSheetId(text: string): string | null {
  const match = text.match(SHEET_URL_RE);
  return match?.[1] ?? null;
}
