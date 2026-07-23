import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Event } from "./event.entity";
import { InvitationStatus } from "./invitation.entity";

@Entity("event_invitations")
export class EventInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  eventId: number;

  @Column({ type: "int" })
  inviterId: number;

  @Column({ type: "int" })
  inviteeId: number;

  @Column({ type: "varchar", default: InvitationStatus.Pending })
  status: InvitationStatus;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "eventId" })
  event: Event;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "inviterId" })
  inviter: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "inviteeId" })
  invitee: User;

  @CreateDateColumn()
  createdAt: Date;
}
