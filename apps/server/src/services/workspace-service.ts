import { DataSource, Repository } from "typeorm";
import { Workspace, WorkspaceMember, WorkspaceRole } from "../database/entities";

export class WorkspaceService {
  private readonly workspaceRepo: Repository<Workspace>;
  private readonly memberRepo: Repository<WorkspaceMember>;

  constructor(dataSource: DataSource) {
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

  async getWorkspaceIdsForUser(userId: number): Promise<number[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      select: ["workspaceId"],
    });
    return memberships.map((m) => m.workspaceId);
  }

  async isWorkspaceOwner(userId: number, workspaceId: number): Promise<boolean> {
    const m = await this.memberRepo.findOneBy({
      workspaceId,
      userId,
    });
    return m?.role === WorkspaceRole.Owner;
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

    const existingMembership = await this.memberRepo.findOneBy({
      workspaceId,
      userId: inviteeId,
    });
    if (existingMembership) {
      throw new Error("Этот пользователь уже в этом workspace.");
    }

    const member = this.memberRepo.create({
      workspaceId,
      userId: inviteeId,
      role: WorkspaceRole.Member,
    });
    await this.memberRepo.save(member);
  }

  /** Добавляет участника в workspace (без проверки на другой workspace). */
  async addMember(workspaceId: number, userId: number): Promise<void> {
    const existing = await this.memberRepo.findOneBy({
      workspaceId,
      userId,
    });
    if (existing) return;

    const member = this.memberRepo.create({
      workspaceId,
      userId,
      role: WorkspaceRole.Member,
    });
    await this.memberRepo.save(member);
  }

  /** Удаляет участника из workspace. */
  async removeMember(workspaceId: number, userId: number): Promise<void> {
    await this.memberRepo.delete({ workspaceId, userId });
  }

  /** Список участников workspace с именами. */
  async getWorkspaceMembers(
    workspaceId: number
  ): Promise<Array<{ userId: number; username: string | null; role: string }>> {
    const members = await this.memberRepo.find({
      where: { workspaceId },
      relations: ["user"],
    });
    return members.map((m) => ({
      userId: m.userId,
      username: m.user?.username ?? null,
      role: m.role,
    }));
  }
}
