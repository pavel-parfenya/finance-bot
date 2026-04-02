import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("app_user_stats_snapshots")
export class AppUserStatsSnapshot {
  @PrimaryColumn({ name: "snapshot_date", type: "date" })
  snapshotDate: string;

  @Column({ name: "total_users", type: "int" })
  totalUsers: number;

  @Column({ name: "empty_users", type: "int" })
  emptyUsers: number;

  @Column({ name: "active_users", type: "int" })
  activeUsers: number;

  @Column({ name: "inactive_users", type: "int" })
  inactiveUsers: number;

  @CreateDateColumn({ name: "computed_at", type: "timestamptz" })
  computedAt: Date;
}
