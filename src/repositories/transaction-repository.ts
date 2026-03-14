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
}
