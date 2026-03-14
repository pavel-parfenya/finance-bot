import { DataSource, Repository } from "typeorm";
import { User } from "../database/entities";

export class UserService {
  private readonly repo: Repository<User>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(User);
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
    return this.repo.findOneBy({ username });
  }
}
