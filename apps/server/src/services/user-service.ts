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
}
