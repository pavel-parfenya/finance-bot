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

  @Column({ type: "int" })
  workspaceId: number;

  @Column({ type: "int" })
  inviterId: number;

  @Column({ type: "int" })
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
