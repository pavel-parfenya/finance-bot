import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Workspace } from "./workspace.entity";
import { User } from "./user.entity";

export enum InvitationStatus {
  Pending = "pending",
  Accepted = "accepted",
  Declined = "declined",
}

@Entity("invitations")
export class Invitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @Column()
  inviterId: number;

  @Column()
  inviteeId: number;

  @Column({ type: "varchar", default: InvitationStatus.Pending })
  status: InvitationStatus;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: "workspaceId" })
  workspace: Workspace;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "inviterId" })
  inviter: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "inviteeId" })
  invitee: User;

  @CreateDateColumn()
  createdAt: Date;
}
