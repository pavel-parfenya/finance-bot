import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";
import { Workspace } from "./workspace.entity";

export enum WorkspaceRole {
  Owner = "owner",
  Member = "member",
}

@Entity("workspace_members")
export class WorkspaceMember {
  @PrimaryColumn({ type: "int" })
  workspaceId: number;

  @PrimaryColumn({ type: "int" })
  userId: number;

  @Column({ type: "enum", enum: WorkspaceRole })
  role: WorkspaceRole;

  /** true = видит все транзакции workspace; false = только свои. Владелец всегда видит все. */
  @Column({ type: "boolean", default: true })
  fullAccess: boolean;

  @ManyToOne(() => Workspace, (w) => w.members)
  @JoinColumn({ name: "workspaceId" })
  workspace: Workspace;

  @ManyToOne(() => User, (u) => u.memberships)
  @JoinColumn({ name: "userId" })
  user: User;
}
