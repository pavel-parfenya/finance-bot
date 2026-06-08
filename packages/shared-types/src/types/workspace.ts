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
  /** Текущая версия блока «Что нового» на сервере. */
  infoChangelogVersion?: number;
  /** Версия, которую пользователь уже отметил прочитанной. */
  infoChangelogSeenVersion?: number;
  error?: string;
}
