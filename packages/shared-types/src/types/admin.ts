export interface AdminTelegramUserOption {
  userId: number;
  telegramId: number;
  username: string | null;
  /** Для селекта: @username или «Пользователь {telegramId}». */
  displayName: string;
}

/** Пользователи, которым не удалось доставить сообщение (массовая рассылка). */
export interface AdminUndeliveredRecipient {
  userId: number;
  displayName: string;
}

/** Тумблер уведомлений супер-админу об оплаченных/отменённых подписках. */
export interface AdminSubscriptionNotificationsResponse {
  enabled: boolean;
  error?: string;
}
