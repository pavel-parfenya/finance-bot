import { DataSource } from "typeorm";
import { User } from "../database/entities/user.entity";
import { Transaction } from "../database/entities/transaction.entity";

export interface AppStats {
  totalUsers: number;
  emptyUsers: number;
  /** Есть транзакция за последние 48 ч (по createdAt) или хотя бы одна запись в debts. */
  activeUsers: number;
  /** Число транзакций за календарный день по UTC. */
  transactionsToday: number;
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

    const now = new Date();
    const dayStartUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
    const dayEndUtc = new Date(dayStartUtc);
    dayEndUtc.setUTCDate(dayEndUtc.getUTCDate() + 1);

    const transactionsToday = await txRepo
      .createQueryBuilder("t")
      .where("t.occurredAt >= :dayStart AND t.occurredAt < :dayEnd", {
        dayStart: dayStartUtc,
        dayEnd: dayEndUtc,
      })
      .getCount();

    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const activeRows = await this.dataSource.query<{ count: string }[]>(
      `
      SELECT COUNT(DISTINCT uid)::text AS count
      FROM (
        SELECT "userId" AS uid FROM transactions WHERE "createdAt" >= $1
        UNION
        SELECT "creatorUserId" FROM debts
        UNION
        SELECT "debtorUserId" FROM debts WHERE "debtorUserId" IS NOT NULL
        UNION
        SELECT "creditorUserId" FROM debts WHERE "creditorUserId" IS NOT NULL
        UNION
        SELECT "mainUserId" FROM debts
      ) AS u
      `,
      [since48h]
    );
    const activeUsers = parseInt(activeRows[0]?.count ?? "0", 10);

    return {
      totalUsers,
      emptyUsers,
      activeUsers,
      transactionsToday,
    };
  }
}
