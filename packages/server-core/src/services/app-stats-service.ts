import { DataSource } from "typeorm";
import { User } from "../database/entities/user.entity";
import { AppUserStatsSnapshot } from "../database/entities/app-user-stats-snapshot.entity";

/** Окно активности: есть операция (datetime транзакции) за последние N часов до момента снимка. */
export const APP_STATS_ACTIVE_HOURS = 96;

export interface AppStats {
  totalUsers: number;
  emptyUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  archivedUsers: number;
}

export interface AppStatsDailyPoint {
  date: string;
  totalUsers: number;
  emptyUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  archivedUsers: number;
}

function formatUtcYmd(y: number, month: number, day: number): string {
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function utcTodayYmd(): { y: number; m: number; d: number } {
  const n = new Date();
  return { y: n.getUTCFullYear(), m: n.getUTCMonth() + 1, d: n.getUTCDate() };
}

/** Конец календарного дня UTC: 23:59:59.999 (снимок за этот день). */
function utcDayEndRef(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

function addUtcDays(
  y: number,
  m: number,
  d: number,
  delta: number
): { y: number; m: number; d: number } {
  const t = Date.UTC(y, m - 1, d + delta);
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function parseISODateOnly(s: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, mo, d] = s.split("-").map((x) => parseInt(x, 10));
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== mo || dt.getUTCDate() !== d)
    return null;
  return { y, m: mo, d };
}

function compareYmd(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number }
): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

export class AppStatsService {
  constructor(private readonly dataSource: DataSource) {}

  async getStats(): Promise<AppStats> {
    const ref = new Date();
    const [totalUsers, emptyUsers, activeUsers, inactiveUsers, archivedUsers] =
      await Promise.all([
        this.countTotalUsersAtRef(ref),
        this.countEmptyUsersAtRef(ref),
        this.countActiveUsersTxAtRef(ref),
        this.countInactiveUsersAtRef(ref),
        this.countArchivedUsersAtRef(ref),
      ]);
    return { totalUsers, emptyUsers, activeUsers, inactiveUsers, archivedUsers };
  }

  /**
   * Снимок за календарный день UTC на отметке 23:59:59.999 (одна точка на графике = один день).
   * Вызывать из cron 23:59 UTC.
   */
  async recordEndOfUtcDaySnapshot(cur: {
    y: number;
    m: number;
    d: number;
  }): Promise<void> {
    const point = await this.computeDailyPointAtEod(cur);
    await this.upsertSnapshot(point);
  }

  /** Cron: снимок за текущий UTC-день в 23:59. */
  async recordTodayUtcDaySnapshotScheduled(): Promise<void> {
    await this.recordEndOfUtcDaySnapshot(utcTodayYmd());
  }

  /**
   * Дозаписывает отсутствующие снимки только за **прошлые** UTC-дни (сегодня — только cron в 23:59 UTC).
   */
  async ensureSnapshotsForRange(fromDate: string, toDate: string): Promise<void> {
    const fromP = parseISODateOnly(fromDate);
    const toP = parseISODateOnly(toDate);
    if (!fromP || !toP) {
      throw new Error("Invalid date format, expected YYYY-MM-DD");
    }
    if (compareYmd(fromP, toP) > 0) {
      throw new Error("fromDate must be <= toDate");
    }
    let days = 0;
    for (
      let cur = fromP;
      compareYmd(cur, toP) <= 0;
      cur = addUtcDays(cur.y, cur.m, cur.d, 1)
    ) {
      days++;
      if (days > 400) {
        throw new Error("Range too large (max 400 days)");
      }
    }

    const today = utcTodayYmd();
    const repo = this.dataSource.getRepository(AppUserStatsSnapshot);

    for (
      let cur = fromP;
      compareYmd(cur, toP) <= 0;
      cur = addUtcDays(cur.y, cur.m, cur.d, 1)
    ) {
      if (compareYmd(cur, today) >= 0) continue;

      const ymd = formatUtcYmd(cur.y, cur.m, cur.d);
      const exists = await repo.exists({ where: { snapshotDate: ymd } });
      if (exists) continue;

      await this.recordEndOfUtcDaySnapshot(cur);
    }
  }

  async getSnapshotSeries(
    fromDate: string,
    toDate: string
  ): Promise<AppStatsDailyPoint[]> {
    const fromP = parseISODateOnly(fromDate);
    const toP = parseISODateOnly(toDate);
    if (!fromP || !toP) {
      throw new Error("Invalid date format, expected YYYY-MM-DD");
    }
    if (compareYmd(fromP, toP) > 0) {
      throw new Error("fromDate must be <= toDate");
    }

    const fromYmd = formatUtcYmd(fromP.y, fromP.m, fromP.d);
    const toYmd = formatUtcYmd(toP.y, toP.m, toP.d);

    const rows = await this.dataSource
      .getRepository(AppUserStatsSnapshot)
      .createQueryBuilder("s")
      .where("s.snapshotDate >= :from AND s.snapshotDate <= :to", {
        from: fromYmd,
        to: toYmd,
      })
      .orderBy("s.snapshotDate", "ASC")
      .getMany();

    return rows.map((r) => ({
      date: r.snapshotDate,
      totalUsers: r.totalUsers,
      emptyUsers: r.emptyUsers,
      activeUsers: r.activeUsers,
      inactiveUsers: r.inactiveUsers,
      archivedUsers: r.archivedUsers ?? 0,
    }));
  }

  private async upsertSnapshot(p: AppStatsDailyPoint): Promise<void> {
    await this.dataSource.query(
      `
      INSERT INTO app_user_stats_snapshots (
        snapshot_date, total_users, empty_users, active_users, inactive_users, archived_users
      )
      VALUES ($1::date, $2, $3, $4, $5, $6)
      ON CONFLICT (snapshot_date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        empty_users = EXCLUDED.empty_users,
        active_users = EXCLUDED.active_users,
        inactive_users = EXCLUDED.inactive_users,
        archived_users = EXCLUDED.archived_users,
        computed_at = now()
      `,
      [
        p.date,
        p.totalUsers,
        p.emptyUsers,
        p.activeUsers,
        p.inactiveUsers,
        p.archivedUsers,
      ]
    );
  }

  private async computeDailyPointAtEod(cur: {
    y: number;
    m: number;
    d: number;
  }): Promise<AppStatsDailyPoint> {
    const ref = utcDayEndRef(cur.y, cur.m, cur.d);
    const [totalUsers, emptyUsers, activeUsers, inactiveUsers, archivedUsers] =
      await Promise.all([
        this.countTotalUsersAtRef(ref),
        this.countEmptyUsersAtRef(ref),
        this.countActiveUsersTxAtRef(ref),
        this.countInactiveUsersAtRef(ref),
        this.countArchivedUsersAtRef(ref),
      ]);
    return {
      date: formatUtcYmd(cur.y, cur.m, cur.d),
      totalUsers,
      emptyUsers,
      activeUsers,
      inactiveUsers,
      archivedUsers,
    };
  }

  private async countArchivedUsersAtRef(ref: Date): Promise<number> {
    return this.dataSource
      .getRepository(User)
      .createQueryBuilder("u")
      .where("u.createdAt <= :ref", { ref })
      .andWhere("u.archived = true")
      .getCount();
  }

  private async countTotalUsersAtRef(ref: Date): Promise<number> {
    return this.dataSource
      .getRepository(User)
      .createQueryBuilder("u")
      .where("u.createdAt <= :ref", { ref })
      .andWhere("u.archived = false")
      .getCount();
  }

  private async countEmptyUsersAtRef(ref: Date): Promise<number> {
    return this.dataSource
      .getRepository(User)
      .createQueryBuilder("u")
      .where("u.createdAt <= :ref", { ref })
      .andWhere("u.archived = false")
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM transactions t
          WHERE t."userId" = u.id AND t."datetime" <= :ref
        )`
      )
      .getCount();
  }

  private async countActiveUsersTxAtRef(ref: Date): Promise<number> {
    const ms = APP_STATS_ACTIVE_HOURS * 60 * 60 * 1000;
    const since = new Date(ref.getTime() - ms);
    const rows = await this.dataSource.query<{ count: string }[]>(
      `
      SELECT COUNT(DISTINCT t."userId")::text AS count
      FROM transactions t
      INNER JOIN users u ON u.id = t."userId" AND u.archived = false
      WHERE t."datetime" >= $1 AND t."datetime" <= $2
      `,
      [since, ref]
    );
    return parseInt(rows[0]?.count ?? "0", 10);
  }

  private async countInactiveUsersAtRef(ref: Date): Promise<number> {
    const ms = APP_STATS_ACTIVE_HOURS * 60 * 60 * 1000;
    const since = new Date(ref.getTime() - ms);
    const rows = await this.dataSource.query<{ count: string }[]>(
      `
      SELECT COUNT(*)::text AS count
      FROM users u
      WHERE u."createdAt" <= $2
        AND u.archived = false
        AND EXISTS (
          SELECT 1 FROM transactions t
          WHERE t."userId" = u.id AND t."datetime" <= $2
        )
        AND NOT EXISTS (
          SELECT 1 FROM transactions t
          WHERE t."userId" = u.id AND t."datetime" >= $1 AND t."datetime" <= $2
        )
      `,
      [since, ref]
    );
    return parseInt(rows[0]?.count ?? "0", 10);
  }
}
