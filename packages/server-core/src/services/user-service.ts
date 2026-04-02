import { DataSource, Repository } from "typeorm";
import type { AnalyticsVoice } from "../analytics/types";
import { User } from "../database/entities";

export const DEFAULT_ANALYTICS_TIMEZONE = "Europe/Moscow";

const ANALYTICS_VOICES: readonly AnalyticsVoice[] = [
  "official",
  "strict",
  "modern",
  "modern_18",
];

function normalizeAnalyticsVoice(raw: string | null | undefined): AnalyticsVoice {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return "official";
  return (ANALYTICS_VOICES as readonly string[]).includes(v)
    ? (v as AnalyticsVoice)
    : "official";
}

export class UserService {
  private readonly repo: Repository<User>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(User);
  }

  async findOneByTelegramId(telegramId: number): Promise<User | null> {
    return this.repo.findOneBy({ telegramId });
  }

  async findById(id: number): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async findAllWithAnalyticsReminderEod(): Promise<User[]> {
    return this.repo.find({ where: { analyticsReminderEod: true } });
  }

  async findAllWithAnalyticsMonthReport(): Promise<User[]> {
    return this.repo.find({ where: { analyticsMonthReport: true } });
  }

  async findAllWithAnalyticsForecastWeekly(): Promise<User[]> {
    return this.repo.find({ where: { analyticsForecastWeekly: true } });
  }

  /** Любая из трёх рассылок (напоминание, отчёт, прогноз). */
  async findAllWithAnyAnalyticsMessaging(): Promise<User[]> {
    return this.repo
      .createQueryBuilder("u")
      .where("u.archived = false")
      .andWhere(
        "(u.analyticsReminderEod = true OR u.analyticsMonthReport = true OR u.analyticsForecastWeekly = true)"
      )
      .getMany();
  }

  /** Для ежемесячного напоминания неактивным (без чекбокса в настройках). */
  async findAllNonArchived(): Promise<User[]> {
    return this.repo.find({ where: { archived: false } });
  }

  async setArchived(userId: number, archived: boolean): Promise<void> {
    await this.repo.update(userId, { archived });
  }

  async setLastInactiveUserNudgeYm(userId: number, ym: string): Promise<void> {
    await this.repo.update(userId, { lastInactiveUserNudgeYm: ym });
  }

  async findOrCreate(telegramId: number, username: string | null): Promise<User> {
    let user = await this.repo.findOneBy({ telegramId });

    if (!user) {
      user = this.repo.create({ telegramId, username });
      user = await this.repo.save(user);
    } else {
      let changed = false;
      if (user.username !== username) {
        user.username = username;
        changed = true;
      }
      if (user.archived) {
        user.archived = false;
        changed = true;
      }
      if (changed) user = await this.repo.save(user);
    }

    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    const normalized = username.replace(/^@/, "").toLowerCase();
    return this.repo
      .createQueryBuilder("u")
      .where("LOWER(u.username) = :name", { name: normalized })
      .getOne();
  }

  async getDefaultCurrency(userId: number): Promise<string | null> {
    const user = await this.repo.findOneBy({ id: userId });
    return user?.defaultCurrency ?? null;
  }

  async setDefaultCurrency(userId: number, currency: string | null): Promise<void> {
    await this.repo.update(userId, {
      defaultCurrency: currency?.trim() || null,
    });
  }

  async getAnalyticsVoice(userId: number): Promise<AnalyticsVoice> {
    const user = await this.repo.findOneBy({ id: userId });
    return normalizeAnalyticsVoice(user?.analyticsVoice);
  }

  async getAnalyticsTimezoneResolved(userId: number): Promise<string> {
    const user = await this.repo.findOneBy({ id: userId });
    const tz = user?.analyticsTimezone?.trim();
    return tz && tz.length > 0 ? tz : DEFAULT_ANALYTICS_TIMEZONE;
  }

  async updateUserSettings(
    userId: number,
    updates: {
      defaultCurrency?: string | null;
      analyticsReminderEod?: boolean;
      analyticsMonthReport?: boolean;
      analyticsForecastWeekly?: boolean;
      analyticsTimezone?: string | null;
      analyticsVoice?: string;
    }
  ): Promise<void> {
    const toUpdate: Record<string, unknown> = {};
    if (updates.defaultCurrency !== undefined) {
      toUpdate.defaultCurrency = updates.defaultCurrency?.trim() || null;
    }
    if (updates.analyticsReminderEod !== undefined) {
      toUpdate.analyticsReminderEod = updates.analyticsReminderEod;
    }
    if (updates.analyticsMonthReport !== undefined) {
      toUpdate.analyticsMonthReport = updates.analyticsMonthReport;
    }
    if (updates.analyticsForecastWeekly !== undefined) {
      toUpdate.analyticsForecastWeekly = updates.analyticsForecastWeekly;
    }
    if (updates.analyticsTimezone !== undefined) {
      toUpdate.analyticsTimezone = updates.analyticsTimezone?.trim() || null;
    }
    if (updates.analyticsVoice !== undefined) {
      toUpdate.analyticsVoice = normalizeAnalyticsVoice(updates.analyticsVoice);
    }
    if (Object.keys(toUpdate).length > 0) {
      await this.repo.update(userId, toUpdate);
    }
  }

  async setLastAnalyticsReminderLocalDate(
    userId: number,
    localYmd: string
  ): Promise<void> {
    await this.repo.update(userId, { lastAnalyticsReminderLocalDate: localYmd });
  }

  async setLastMonthlyReportSentYm(userId: number, ym: string): Promise<void> {
    await this.repo.update(userId, { lastMonthlyReportSentYm: ym });
  }

  async setLastForecastSentLocalDate(userId: number, localYmd: string): Promise<void> {
    await this.repo.update(userId, { lastForecastSentLocalDate: localYmd });
  }

  async getInfoChangelogSeenVersion(userId: number): Promise<number> {
    const user = await this.repo.findOneBy({ id: userId });
    return user?.infoChangelogSeenVersion ?? 0;
  }

  async markInfoChangelogSeen(userId: number, version: number): Promise<void> {
    await this.repo.update(userId, { infoChangelogSeenVersion: version });
  }

  /** Одноразово: все пользователи снова увидят индикатор «нового» в инфо. */
  async resetAllInfoChangelogSeen(): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(User)
      .set({ infoChangelogSeenVersion: 0 })
      .execute();
  }
}
