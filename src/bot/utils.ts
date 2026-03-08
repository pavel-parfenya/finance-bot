import { Context } from "grammy";

export function getUserDisplayName(ctx: Context): string {
  const from = ctx.from;
  if (!from) return "Неизвестный";

  if (from.first_name && from.last_name) {
    return `${from.first_name} ${from.last_name}`;
  }

  return from.first_name || from.username || "Неизвестный";
}
