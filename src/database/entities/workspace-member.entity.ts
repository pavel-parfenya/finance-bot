import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";
import { Workspace } from "./workspace.entity";

export enum WorkspaceRole {
  Owner = "owner",
  Member = "member",
}

@Entity("workspace_members")
export class WorkspaceMember {
  @PrimaryColumn()
  workspaceId: number;

  @PrimaryColumn()
  userId: number;

  @Column({ type: "enum", enum: WorkspaceRole })
  role: WorkspaceRole;

  @ManyToOne(() => Workspace, (w) => w.members)
  @JoinColumn({ name: "workspaceId" })
  workspace: Workspace;

  @ManyToOne(() => User, (u) => u.memberships)
  @JoinColumn({ name: "userId" })
  user: User;
}
