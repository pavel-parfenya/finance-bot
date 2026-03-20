import { DataSource } from "typeorm";
import { User } from "../database/entities/user.entity";
import { Transaction } from "../database/entities/transaction.entity";

export interface AppStats {
  totalUsers: number;
  emptyUsers: number;
  activeUsers: number;
}

export class AppStatsService {
  constructor(private readonly dataSource: DataSource) {}

  async getStats(): Promise<AppStats> {
    const userRepo = this.dataSource.getRepository(User);
    const txRepo = this.dataSource.getRepository(Transaction);

    const totalUsers = await userRepo.count();

    const usersWithTx = await txRepo
      .createQueryBuilder("t")
      .select("DISTINCT t.userId", "userId")
      .getRawMany();
    const userIdsWithTx = new Set(
      usersWithTx.map((r: Record<string, unknown>) => Number(r.userId ?? r.userid ?? 0))
    );

    const allUsers = await userRepo.find({ select: ["id"] });
    const emptyUsers = allUsers.filter((u) => !userIdsWithTx.has(u.id)).length;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeResult = await txRepo
      .createQueryBuilder("t")
      .select("COUNT(DISTINCT t.userId)", "count")
      .where("t.createdAt >= :since", { since })
      .getRawOne<{ count: string }>();

    const activeUsers = parseInt(activeResult?.count ?? "0", 10);

    return {
      totalUsers,
      emptyUsers,
      activeUsers,
    };
  }
}
