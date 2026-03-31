/** When user lacks full access on some workspaces, restrict listing to own transactions. */
export function buildAccess(
  workspaceIds: number[],
  fullAccessWorkspaceIds: number[],
  userId: number
): { fullAccessWorkspaceIds: number[]; restrictToUserId: number } | undefined {
  if (fullAccessWorkspaceIds.length >= workspaceIds.length) return undefined;
  return { fullAccessWorkspaceIds, restrictToUserId: userId };
}
