import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";
import { triggerAnalyticsAfterTransaction } from "../analytics-trigger";

/** Только в dev: /test-analytics — отправить инсайт аналитики сейчас */
export function createTestAnalyticsHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    if (process.env.NODE_ENV === "production") return;

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    const workspace = await deps.workspaceService.getOrCreateWorkspaceForUser(user.id);

    await ctx.reply("Отправляю аналитику...");

    try {
      await triggerAnalyticsAfterTransaction(
        user.id,
        workspace.id,
        {
          analyticsInsightService: deps.analyticsInsightService,
          userService: deps.userService,
          workspaceService: deps.workspaceService,
          bot: deps.bot!,
          monthlyReportGenerator: deps.monthlyReportGenerator,
        },
        { forceFullReport: true }
      );
      await ctx.reply("Готово.");
    } catch (err) {
      console.error("Test analytics:", err);
      await ctx.reply("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    }
  };
}
