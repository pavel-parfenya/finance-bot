export interface WorkspaceMember {
  userId: number;
  username: string | null;
  role: string;
  /** true = видит все транзакции; false = только свои. Владелец всегда true. */
  fullAccess: boolean;
}

export interface WorkspaceInfo {
  userId?: number;
  isOwner?: boolean;
  members?: WorkspaceMember[];
  /**
   * Совместный учёт временно заморожен: участников больше одного, но у владельца
   * пространства нет платной фичи `collaborative`. Каждый видит только свои
   * записи; вернётся, когда владелец оформит подписку.
   */
  collaborativeLocked?: boolean;
  /** Текущая версия блока «Что нового» на сервере. */
  infoChangelogVersion?: number;
  /** Версия, которую пользователь уже отметил прочитанной. */
  infoChangelogSeenVersion?: number;
  error?: string;
}
