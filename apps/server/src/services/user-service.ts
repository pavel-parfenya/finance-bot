import { DataSource, Repository } from "typeorm";
import { User } from "../database/entities";

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

  async findAllWithAnalyticsEnabled(): Promise<User[]> {
    return this.repo.find({ where: { analyticsEnabled: true } });
  }

  async findOrCreate(telegramId: number, username: string | null): Promise<User> {
    let user = await this.repo.findOneBy({ telegramId });

    if (!user) {
      user = this.repo.create({ telegramId, username });
      user = await this.repo.save(user);
    } else if (user.username !== username) {
      user.username = username;
      user = await this.repo.save(user);
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

  async getAnalyticsEnabled(userId: number): Promise<boolean> {
    const user = await this.repo.findOneBy({ id: userId });
    return user?.analyticsEnabled ?? true;
  }

  async getAnalyticsVoice(userId: number): Promise<string> {
    const user = await this.repo.findOneBy({ id: userId });
    return user?.analyticsVoice ?? "official";
  }

  async updateUserSettings(
    userId: number,
    updates: {
      defaultCurrency?: string | null;
      analyticsEnabled?: boolean;
      analyticsVoice?: string;
    }
  ): Promise<void> {
    const toUpdate: Record<string, unknown> = {};
    if (updates.defaultCurrency !== undefined) {
      toUpdate.defaultCurrency = updates.defaultCurrency?.trim() || null;
    }
    if (updates.analyticsEnabled !== undefined) {
      toUpdate.analyticsEnabled = updates.analyticsEnabled;
    }
    if (updates.analyticsVoice !== undefined) {
      toUpdate.analyticsVoice = updates.analyticsVoice;
    }
    if (Object.keys(toUpdate).length > 0) {
      await this.repo.update(userId, toUpdate);
    }
  }
}
