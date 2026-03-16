import { DataSource, Repository } from "typeorm";
import { Transaction } from "../database/entities";
import { Expense } from "../domain/models";

export class TransactionRepository {
  private readonly repo: Repository<Transaction>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Transaction);
  }

  async save(
    workspaceId: number,
    userId: number,
    expense: Expense
  ): Promise<Transaction> {
    const time = expense.date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const transaction = this.repo.create({
      workspaceId,
      userId,
      date: expense.date,
      time,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency,
      store: expense.store,
      personDisplayName: expense.username,
    });

    return this.repo.save(transaction);
  }

  async findByWorkspaceId(workspaceId: number): Promise<Transaction[]> {
    return this.repo.find({
      where: { workspaceId },
      order: { date: "ASC", createdAt: "ASC" },
    });
  }

  async findByWorkspaceIds(workspaceIds: number[]): Promise<Transaction[]> {
    if (workspaceIds.length === 0) return [];
    return this.repo
      .createQueryBuilder("t")
      .where("t.workspaceId IN (:...ids)", { ids: workspaceIds })
      .orderBy("t.date", "ASC")
      .addOrderBy("t.createdAt", "ASC")
      .getMany();
  }

  async findByIdAndWorkspaceIds(
    id: number,
    workspaceIds: number[]
  ): Promise<Transaction | null> {
    if (workspaceIds.length === 0) return null;
    return this.repo
      .createQueryBuilder("t")
      .where("t.id = :id", { id })
      .andWhere("t.workspaceId IN (:...ids)", { ids: workspaceIds })
      .getOne();
  }

  async deleteById(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async transferToWorkspace(
    transactionIds: number[],
    newWorkspaceId: number
  ): Promise<void> {
    if (transactionIds.length === 0) return;
    await this.repo
      .createQueryBuilder()
      .update(Transaction)
      .set({ workspaceId: newWorkspaceId })
      .where("id IN (:...ids)", { ids: transactionIds })
      .execute();
  }

  async deleteByWorkspaceId(workspaceId: number): Promise<void> {
    await this.repo.delete({ workspaceId });
  }

  async update(
    id: number,
    updates: {
      description?: string;
      category?: string;
      amount?: number;
      currency?: string;
      date?: Date;
    }
  ): Promise<Transaction | null> {
    const tx = await this.repo.findOneBy({ id });
    if (!tx) return null;
    if (updates.description !== undefined) tx.description = updates.description;
    if (updates.category !== undefined) tx.category = updates.category;
    if (updates.amount !== undefined) tx.amount = updates.amount;
    if (updates.currency !== undefined) tx.currency = updates.currency;
    if (updates.date !== undefined) {
      tx.date = updates.date;
      tx.time = updates.date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return this.repo.save(tx);
  }

  async findByWorkspaceIdsForMonth(
    workspaceIds: number[],
    year: number,
    month: number
  ): Promise<Transaction[]> {
    if (workspaceIds.length === 0) return [];
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return this.findByWorkspaceIdsForPeriod(workspaceIds, start, end);
  }

  async findByWorkspaceIdsForPeriod(
    workspaceIds: number[],
    start: Date,
    end: Date,
    filters?: {
      category?: string;
      currency?: string;
      userId?: number;
      search?: string;
    },
    pagination?: { limit: number; offset: number }
  ): Promise<Transaction[]> {
    if (workspaceIds.length === 0) return [];
    const qb = this.repo
      .createQueryBuilder("t")
      .where("t.workspaceId IN (:...ids)", { ids: workspaceIds })
      .andWhere("t.date >= :start", { start })
      .andWhere("t.date <= :end", { end });

    if (filters?.category?.trim()) {
      qb.andWhere("t.category = :category", { category: filters.category.trim() });
    }
    if (filters?.currency?.trim()) {
      qb.andWhere("t.currency = :currency", { currency: filters.currency.trim() });
    }
    if (filters?.userId) {
      qb.andWhere("t.userId = :userId", { userId: filters.userId });
    }
    if (filters?.search?.trim()) {
      qb.andWhere("t.description ILIKE :search", {
        search: `%${filters.search.trim()}%`,
      });
    }

    qb.orderBy("t.date", "DESC").addOrderBy("t.createdAt", "DESC");
    if (pagination) {
      qb.take(pagination.limit).skip(pagination.offset);
    }
    return qb.getMany();
  }

  async findByWorkspaceIdsPaginated(
    workspaceIds: number[],
    pagination?: { limit: number; offset: number }
  ): Promise<Transaction[]> {
    if (workspaceIds.length === 0) return [];
    const qb = this.repo
      .createQueryBuilder("t")
      .where("t.workspaceId IN (:...ids)", { ids: workspaceIds })
      .orderBy("t.date", "DESC")
      .addOrderBy("t.createdAt", "DESC");
    if (pagination) {
      qb.take(pagination.limit).skip(pagination.offset);
    }
    return qb.getMany();
  }

  async getUniqueCategories(workspaceIds: number[]): Promise<string[]> {
    if (workspaceIds.length === 0) return [];
    const rows = await this.repo
      .createQueryBuilder("t")
      .select("DISTINCT t.category", "category")
      .where("t.workspaceId IN (:...ids)", { ids: workspaceIds })
      .andWhere("t.category IS NOT NULL")
      .andWhere("t.category != ''")
      .orderBy("t.category", "ASC")
      .getRawMany<{ category: string }>();
    return rows.map((r) => r.category).filter(Boolean);
  }
}
