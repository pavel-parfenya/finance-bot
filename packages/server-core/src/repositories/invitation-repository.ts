import { DataSource, Repository } from "typeorm";
import { Invitation, InvitationStatus } from "../database/entities";

export class InvitationRepository {
  private readonly repo: Repository<Invitation>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Invitation);
  }

  async create(
    workspaceId: number,
    inviterId: number,
    inviteeId: number
  ): Promise<Invitation> {
    const inv = this.repo.create({
      workspaceId,
      inviterId,
      inviteeId,
      status: InvitationStatus.Pending,
    });
    return this.repo.save(inv);
  }

  async findById(id: number): Promise<Invitation | null> {
    return this.repo.findOne({
      where: { id },
      relations: ["workspace", "inviter", "invitee"],
    });
  }

  async updateStatus(id: number, status: InvitationStatus): Promise<Invitation | null> {
    const inv = await this.repo.findOneBy({ id });
    if (!inv) return null;
    inv.status = status;
    return this.repo.save(inv);
  }
}
