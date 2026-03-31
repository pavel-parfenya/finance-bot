/** Форматирует email бота для лёгкого копирования в Telegram. */
export function formatBotEmailForCopy(email: string): string {
  return "📧 Email бота (скопируйте для доступа к таблице):\n\n" + email;
}
