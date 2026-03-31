export interface ResolvedTelegramUser {
  userId: number;
  workspaceIds: number[];
  creatorDisplayName: string;
  fullAccessWorkspaceIds: number[];
}

export type ResolveUserError = { error: string };
