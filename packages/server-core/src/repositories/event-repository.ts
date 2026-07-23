import { DataSource, Repository } from "typeorm";
import {
  Event,
  EventStatus,
  EventMember,
  EventMemberRole,
  EventInvitation,
  InvitationStatus,
} from "../database/entities";
import type { EventSettlementRow } from "@finance-bot/shared-types";

export class EventRepository {
  private readonly eventRepo: Repository<Event>;
  private readonly memberRepo: Repository<EventMember>;
  private readonly invitationRepo: Repository<EventInvitation>;

  constructor(dataSource: DataSource) {
    this.eventRepo = dataSource.getRepository(Event);
    this.memberRepo = dataSource.getRepository(EventMember);
    this.invitationRepo = dataSource.getRepository(EventInvitation);
  }

  // --- Event -------------------------------------------------------------

  async create(data: {
    name: string;
    description: string;
    keywords: string;
    creatorUserId: number;
    currency: string;
  }): Promise<Event> {
    const event = this.eventRepo.create({
      ...data,
      status: EventStatus.Active,
    });
    return this.eventRepo.save(event);
  }

  async findById(id: number): Promise<Event | null> {
    return this.eventRepo.findOne({ where: { id }, relations: ["creator"] });
  }

  async updateInfo(
    id: number,
    updates: { name?: string; description?: string; keywords?: string }
  ): Promise<void> {
    await this.eventRepo.update(id, updates);
  }

  async saveSettlement(
    id: number,
    settlement: EventSettlementRow[],
    settledAt: Date
  ): Promise<void> {
    await this.eventRepo.update(id, {
      settlement,
      settledAt,
      status: EventStatus.Settled,
    });
  }

  async delete(id: number): Promise<void> {
    await this.invitationRepo.delete({ eventId: id });
    await this.memberRepo.delete({ eventId: id });
    await this.eventRepo.delete(id);
  }

  /** События, где пользователь — участник (по членству). */
  async findEventsForUser(userId: number): Promise<Event[]> {
    return this.eventRepo
      .createQueryBuilder("e")
      .innerJoin(EventMember, "m", "m.eventId = e.id AND m.userId = :userId", {
        userId,
      })
      .leftJoinAndSelect("e.creator", "creator")
      .orderBy("e.createdAt", "DESC")
      .getMany();
  }

  /** Активные события пользователя (для контекста LLM). */
  async findActiveEventsForUser(userId: number): Promise<Event[]> {
    return this.eventRepo
      .createQueryBuilder("e")
      .innerJoin(EventMember, "m", "m.eventId = e.id AND m.userId = :userId", {
        userId,
      })
      .where("e.status = :status", { status: EventStatus.Active })
      .orderBy("e.createdAt", "DESC")
      .getMany();
  }

  // --- Members -----------------------------------------------------------

  async addMember(
    eventId: number,
    userId: number,
    role: EventMemberRole = EventMemberRole.Member
  ): Promise<void> {
    const existing = await this.memberRepo.findOneBy({ eventId, userId });
    if (existing) return;
    const member = this.memberRepo.create({ eventId, userId, role });
    await this.memberRepo.save(member);
  }

  async removeMember(eventId: number, userId: number): Promise<void> {
    await this.memberRepo.delete({ eventId, userId });
  }

  async findMembers(eventId: number): Promise<EventMember[]> {
    return this.memberRepo.find({
      where: { eventId },
      relations: ["user"],
    });
  }

  async findMembership(eventId: number, userId: number): Promise<EventMember | null> {
    return this.memberRepo.findOneBy({ eventId, userId });
  }

  async countMembers(eventId: number): Promise<number> {
    return this.memberRepo.count({ where: { eventId } });
  }

  // --- Invitations -------------------------------------------------------

  async createInvitation(
    eventId: number,
    inviterId: number,
    inviteeId: number
  ): Promise<EventInvitation> {
    const inv = this.invitationRepo.create({
      eventId,
      inviterId,
      inviteeId,
      status: InvitationStatus.Pending,
    });
    return this.invitationRepo.save(inv);
  }

  async findInvitationById(id: number): Promise<EventInvitation | null> {
    return this.invitationRepo.findOne({
      where: { id },
      relations: ["event", "inviter", "invitee"],
    });
  }

  async findPendingInvitation(
    eventId: number,
    inviteeId: number
  ): Promise<EventInvitation | null> {
    return this.invitationRepo.findOneBy({
      eventId,
      inviteeId,
      status: InvitationStatus.Pending,
    });
  }

  async updateInvitationStatus(id: number, status: InvitationStatus): Promise<void> {
    await this.invitationRepo.update(id, { status });
  }
}
