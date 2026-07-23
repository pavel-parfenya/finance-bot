import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";

function invitationIdFromData(data: string): number | null {
  const m = data.match(/^event_invite_(?:accept|decline):(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export function createEventInviteHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const cq = ctx.callbackQuery;
    if (!cq || typeof cq.data !== "string") return;

    const id = invitationIdFromData(cq.data);
    if (!id) return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) {
      await ctx.answerCallbackQuery({ text: "Ошибка. Напишите боту /start." });
      return;
    }

    const isAccept = cq.data.startsWith("event_invite_accept");
    const result = isAccept
      ? await deps.eventService.acceptInvite(id, user.id)
      : await deps.eventService.declineInvite(id, user.id);

    if (!result.ok) {
      await ctx.answerCallbackQuery({
        text: result.error ?? "Не удалось обработать приглашение.",
      });
      return;
    }

    const eventName = result.eventName ? `«${result.eventName}»` : "событие";
    if (isAccept) {
      await ctx.answerCallbackQuery({ text: "Вы присоединились!" });
      await ctx.api.editMessageText(
        ctx.chat!.id,
        cq.message!.message_id,
        `Вы присоединились к событию ${eventName}. Записывайте траты — бот привяжет их автоматически.`
      );
    } else {
      await ctx.answerCallbackQuery({ text: "Приглашение отклонено." });
      await ctx.api.editMessageText(
        ctx.chat!.id,
        cq.message!.message_id,
        `Вы отклонили приглашение в событие ${eventName}.`
      );
    }
  };
}
