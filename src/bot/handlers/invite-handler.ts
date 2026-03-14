import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser, requireWorkspaceWithSheet } from "../utils";

export function createInviteHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    const workspace = await requireWorkspaceWithSheet(ctx, user, deps.workspaceService);
    if (!workspace) return;

    const text = ctx.message?.text ?? "";
    const args = text.replace(/^\/invite\s*/, "").trim();
    const username = args.replace(/^@/, "");

    if (!username) {
      await ctx.reply("Укажите username участника:\n/invite @username");
      return;
    }

    const invitee = await deps.userService.findByUsername(username);
    if (!invitee) {
      await ctx.reply(
        `Пользователь @${username} не найден.\n` +
          "Он должен сначала написать боту /start, а потом вы сможете его пригласить."
      );
      return;
    }

    try {
      await deps.workspaceService.inviteMember(workspace.id, user.id, invitee.id);
      await ctx.reply(`Пользователь @${username} добавлен в вашу таблицу!`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Неизвестная ошибка";
      await ctx.reply(`Не удалось пригласить: ${msg}`);
    }
  };
}
