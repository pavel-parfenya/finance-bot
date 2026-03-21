import { Context } from "grammy";
import { BotDeps } from "../bot";
import { resolveUser } from "../utils";

export function createAppStatsHandler(deps: BotDeps) {
  return async (ctx: Context): Promise<void> => {
    const superAdmin = deps.superAdminUsername;
    if (!superAdmin || !deps.appStatsService) {
      await ctx.reply("Команда недоступна.");
      return;
    }

    const user = await resolveUser(ctx, deps.userService);
    if (!user) return;

    const callerUsername = (user.username ?? "").toLowerCase();
    if (callerUsername !== superAdmin.toLowerCase()) {
      await ctx.reply("Нет доступа.");
      return;
    }

    try {
      const stats = await deps.appStatsService!.getStats();
      const text =
        `📊 Статистика приложения\n\n` +
        `Всего пользователей: ${stats.totalUsers}\n` +
        `Пустых (без транзакций): ${stats.emptyUsers}\n` +
        `Активных (траты за 48ч): ${stats.activeUsers}`;

      await ctx.reply(text);
    } catch (err) {
      console.error("App stats error:", err);
      await ctx.reply("Ошибка получения статистики.");
    }
  };
}
