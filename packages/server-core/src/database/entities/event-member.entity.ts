import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";
import { Event } from "./event.entity";

export enum EventMemberRole {
  Owner = "owner",
  Member = "member",
}

@Entity("event_members")
export class EventMember {
  @PrimaryColumn({ type: "int" })
  eventId: number;

  @PrimaryColumn({ type: "int" })
  userId: number;

  @Column({ type: "varchar", length: 10, default: EventMemberRole.Member })
  role: EventMemberRole;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "eventId" })
  event: Event;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;
}
