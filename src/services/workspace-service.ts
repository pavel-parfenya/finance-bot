import { DataSource, Repository } from "typeorm";
import { Workspace, WorkspaceMember, WorkspaceRole } from "../database/entities";
import { ISheetManager } from "../domain/interfaces";
import { Expense } from "../domain/models";

export class WorkspaceService {
  private readonly workspaceRepo: Repository<Workspace>;
  private readonly memberRepo: Repository<WorkspaceMember>;

  constructor(
    dataSource: DataSource,
    private readonly sheetManager: ISheetManager
  ) {
    this.workspaceRepo = dataSource.getRepository(Workspace);
    this.memberRepo = dataSource.getRepository(WorkspaceMember);
  }

  async getWorkspaceForUser(userId: number): Promise<Workspace | null> {
    const membership = await this.memberRepo.findOne({
      where: { userId },
      relations: ["workspace"],
    });
    return membership?.workspace ?? null;
  }

  /** Возвращает workspace пользователя, создавая «ожидающий» (без таблицы), если нет. */
  async getOrCreateWorkspaceForUser(userId: number): Promise<Workspace> {
    let workspace = await this.getWorkspaceForUser(userId);
    if (workspace) return workspace;

    workspace = this.workspaceRepo.create({
      sheetId: "",
      title: "Мои транзакции",
      ownerId: userId,
    });
    const saved = await this.workspaceRepo.save(workspace);

    const member = this.memberRepo.create({
      workspaceId: saved.id,
      userId,
      role: WorkspaceRole.Owner,
    });
    await this.memberRepo.save(member);
    return saved;
  }

  hasSheet(workspace: Workspace): boolean {
    return !!workspace.sheetId?.trim();
  }

  async createWorkspace(
    ownerId: number,
    sheetId: string,
    title: string
  ): Promise<Workspace> {
    const existing = await this.getWorkspaceForUser(ownerId);
    if (existing) {
      throw new Error(
        "Используйте linkSheetToPendingWorkspace для существующего workspace."
      );
    }

    await this.sheetManager.initSheet(sheetId);

    const workspace = this.workspaceRepo.create({
      sheetId,
      title,
      ownerId,
    });
    const saved = await this.workspaceRepo.save(workspace);

    const member = this.memberRepo.create({
      workspaceId: saved.id,
      userId: ownerId,
      role: WorkspaceRole.Owner,
    });
    await this.memberRepo.save(member);

    return saved;
  }

  /** Подключает таблицу к существующему workspace без sheet и переносит транзакции в Sheets. */
  async linkSheetToPendingWorkspace(
    ownerId: number,
    sheetId: string,
    title: string,
    transactionRepo: {
      findByWorkspaceId: (
        id: number
      ) => Promise<
        Array<{
          date: Date;
          time: string;
          description: string;
          category: string;
          amount: number;
          currency: string;
          store: string;
          personDisplayName: string;
        }>
      >;
    }
  ): Promise<Workspace> {
    const workspace = await this.getWorkspaceForUser(ownerId);
    if (!workspace || this.hasSheet(workspace)) {
      throw new Error("У вас уже есть подключённая таблица или нет ожидающих данных.");
    }

    await this.sheetManager.initSheet(sheetId);

    workspace.sheetId = sheetId;
    workspace.title = title;
    const saved = await this.workspaceRepo.save(workspace);

    const transactions = await transactionRepo.findByWorkspaceId(workspace.id);
    for (const t of transactions) {
      const [h, m] = t.time.split(":").map(Number);
      const date = new Date(t.date);
      date.setHours(h || 0, m || 0, 0, 0);
      await this.sheetManager.appendExpense(sheetId, {
        date,
        description: t.description,
        category: t.category as Expense["category"],
        amount: Number(t.amount),
        currency: t.currency,
        store: t.store,
        username: t.personDisplayName,
      });
    }

    return saved;
  }

  async inviteMember(
    workspaceId: number,
    inviterId: number,
    inviteeId: number
  ): Promise<void> {
    const inviterMembership = await this.memberRepo.findOneBy({
      workspaceId,
      userId: inviterId,
    });
    if (!inviterMembership || inviterMembership.role !== WorkspaceRole.Owner) {
      throw new Error("Только владелец может приглашать участников.");
    }

    const existingMembership = await this.memberRepo.findOneBy({ userId: inviteeId });
    if (existingMembership) {
      throw new Error("Этот пользователь уже состоит в таблице.");
    }

    const member = this.memberRepo.create({
      workspaceId,
      userId: inviteeId,
      role: WorkspaceRole.Member,
    });
    await this.memberRepo.save(member);
  }
}
