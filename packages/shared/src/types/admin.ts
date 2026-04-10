export interface AdminTelegramUserOption {
  userId: number;
  telegramId: number;
  username: string | null;
  /** Для селекта: @username или «Пользователь {telegramId}». */
  displayName: string;
}
