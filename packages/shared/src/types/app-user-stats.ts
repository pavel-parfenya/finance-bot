export interface AppUserStatsPoint {
  date: string;
  totalUsers: number;
  emptyUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}

export interface AppUserStatsResponse {
  current: {
    totalUsers: number;
    emptyUsers: number;
    activeUsers: number;
    inactiveUsers: number;
  };
  series: AppUserStatsPoint[];
  activeWindowHours: number;
  error?: string;
}
