import { InlineKeyboard } from "grammy";
import { Context } from "grammy";
import { BotDeps } from "../bot";
import { InvitationStatus } from "../../database/entities";
import { resolveUser } from "../utils";

function inviteIdFromData(data: string): number | null {
  const m = data.match(/^invite_(?:accept|decline|transfer|delete):(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export function createInviteHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const cq = ctx.callbackQuery;
    if (!cq || typeof cq.data !== "string") return;

    const id = inviteIdFromData(cq.data);
    if (!id) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) {
      await ctx.answerCallbackQuery({ text: "Ошибка. Напишите боту /start." });
      return;
    }

    const inv = await deps.invitationRepo.findById(id);
    if (!inv || inv.status !== InvitationStatus.Pending) {
      await ctx.answerCallbackQuery({
        text: "Приглашение не найдено или уже обработано.",
      });
      return;
    }

    if (inv.inviteeId !== user.id) {
      await ctx.answerCallbackQuery({ text: "Это приглашение не для вас." });
      return;
    }

    const action = cq.data.startsWith("invite_accept")
      ? "accept"
      : cq.data.startsWith("invite_decline")
        ? "decline"
        : cq.data.startsWith("invite_transfer")
          ? "transfer"
          : "delete";

    if (action === "decline") {
      await deps.invitationRepo.updateStatus(id, InvitationStatus.Declined);
      await ctx.answerCallbackQuery({ text: "Приглашение отклонено." });
      await ctx.api.editMessageText(
        ctx.chat!.id,
        cq.message!.message_id,
        "Вы отклонили приглашение."
      );
      return;
    }

    if (action === "accept") {
      const oldWorkspace = await deps.workspaceService.getWorkspaceForUser(user.id);
      const txs = oldWorkspace
        ? await deps.transactionRepo.findByWorkspaceId(oldWorkspace.id)
        : [];
      const count = txs.length;

      if (count === 0) {
        await doAddToWorkspace(deps, inv, user.id);
        await deps.invitationRepo.updateStatus(id, InvitationStatus.Accepted);
        await ctx.answerCallbackQuery({ text: "Вы добавлены!" });
        await ctx.api.editMessageText(
          ctx.chat!.id,
          cq.message!.message_id,
          "Вы присоединились к общему учёту расходов."
        );
        return;
      }

      await ctx.answerCallbackQuery();
      const kb = new InlineKeyboard()
        .text("Перенести записи", `invite_transfer:${id}`)
        .text("Удалить записи", `invite_delete:${id}`);
      await ctx.api.editMessageText(
        ctx.chat!.id,
        cq.message!.message_id,
        `У вас ${count} ${pluralize(count, "запись", "записи", "записей")}.\n\n` +
          "Перенести их в общий workspace или удалить?\n\n" +
          "⚠️ Если выбрать «Удалить» — ваши записи будут удалены безвозвратно и восстановить их будет нельзя.",
        { reply_markup: kb }
      );
      return;
    }

    if (action === "transfer" || action === "delete") {
      const oldWorkspace = await deps.workspaceService.getWorkspaceForUser(user.id);
      const workspaceId = inv.workspaceId;

      if (oldWorkspace) {
        const txs = await deps.transactionRepo.findByWorkspaceId(oldWorkspace.id);
        const ids = txs.map((t) => t.id);

        if (action === "transfer" && ids.length > 0) {
          await deps.transactionRepo.transferToWorkspace(ids, workspaceId);
        } else if (action === "delete" && ids.length > 0) {
          await deps.transactionRepo.deleteByWorkspaceId(oldWorkspace.id);
        }
        await deps.workspaceService.removeMember(oldWorkspace.id, user.id);
      }

      await deps.workspaceService.addMember(workspaceId, user.id);
      await deps.invitationRepo.updateStatus(id, InvitationStatus.Accepted);
      await ctx.answerCallbackQuery({
        text:
          action === "transfer"
            ? "Записи перенесены, вы добавлены!"
            : "Записи удалены, вы добавлены.",
      });
      await ctx.api.editMessageText(
        ctx.chat!.id,
        cq.message!.message_id,
        action === "transfer"
          ? "Ваши записи перенесены в общий учёт. Вы присоединились."
          : "Вы присоединились к общему учёту. Ваши старые записи были удалены."
      );
    }
  };
}

async function doAddToWorkspace(
  deps: BotDeps,
  inv: { workspaceId: number; inviteeId: number },
  userId: number
): Promise<void> {
  const oldWorkspace = await deps.workspaceService.getWorkspaceForUser(userId);
  if (oldWorkspace) {
    await deps.workspaceService.removeMember(oldWorkspace.id, userId);
  }
  await deps.workspaceService.addMember(inv.workspaceId, userId);
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
