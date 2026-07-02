export interface AppUserStatsPoint {
  date: string;
  totalUsers: number;
  emptyUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  archivedUsers: number;
  activeSubscriptions: number;
}

export interface AppUserStatsResponse {
  current: {
    totalUsers: number;
    emptyUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    archivedUsers: number;
    activeSubscriptions: number;
  };
  series: AppUserStatsPoint[];
  activeWindowHours: number;
  error?: string;
}
