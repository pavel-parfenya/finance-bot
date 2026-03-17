export interface WorkspaceMember {
  userId: number;
  username: string | null;
  role: string;
}

export interface WorkspaceInfo {
  userId?: number;
  isOwner?: boolean;
  members?: WorkspaceMember[];
  error?: string;
}
