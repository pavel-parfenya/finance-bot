import type { SubscriptionCancelReason } from "./admin-notify-service.types";

/** Часовой пояс дат в сообщениях админу (продукт ориентирован на Беларусь). */
const ADMIN_TIMEZONE = "Europe/Minsk";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  timeZone: ADMIN_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatEventDate(date: Date): string {
  return dateFormat.format(date);
}

export function personDisplayName(
  username: string | null | undefined,
  telegramId: number
): string {
  const u = username?.replace(/^@/, "").trim();
  if (u) return `@${u}`;
  return `Пользователь ${telegramId}`;
}

export const CANCEL_REASON_TEXT: Record<SubscriptionCancelReason, string> = {
  user: "отменена пользователем (автопродление выключено)",
  bepaid: "отменена на стороне bePaid",
  payment_failed: "не прошло очередное списание",
};
