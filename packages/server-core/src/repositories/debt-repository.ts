import { DataSource, Repository } from "typeorm";
import { Debt, DebtStatus } from "../database/entities";

export class DebtRepository {
  private readonly repo: Repository<Debt>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Debt);
  }

  async create(data: {
    creatorUserId: number;
    debtorUserId: number | null;
    creditorUserId: number | null;
    debtorName: string;
    creditorName: string;
    amount: number;
    currency: string;
    lentDate?: Date | null;
    deadline?: Date | null;
    repaidAmount?: number;
    status?: DebtStatus;
    mainUserId: number;
  }): Promise<Debt> {
    const debt = this.repo.create({
      ...data,
      repaidAmount: data.repaidAmount ?? 0,
      status: data.status ?? DebtStatus.Active,
    });
    return this.repo.save(debt);
  }

  async findById(id: number): Promise<Debt | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["debtor", "creditor"],
    });
  }

  async findByUserId(userId: number): Promise<Debt[]> {
    return this.repo
      .createQueryBuilder("d")
      .leftJoinAndSelect("d.debtor", "debtor")
      .leftJoinAndSelect("d.creditor", "creditor")
      .where(
        "d.debtorUserId = :userId OR d.creditorUserId = :userId OR d.creatorUserId = :userId",
        {
          userId,
        }
      )
      .orderBy("d.createdAt", "DESC")
      .getMany();
  }

  async update(
    id: number,
    updates: {
      debtorName?: string;
      creditorName?: string;
      amount?: number;
      currency?: string;
      lentDate?: Date | null;
      deadline?: Date | null;
      repaidAmount?: number;
      debtorUserId?: number | null;
      creditorUserId?: number | null;
      status?: DebtStatus;
      mainUserId?: number;
    }
  ): Promise<Debt | null> {
    await this.repo.update(id, updates as object);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
