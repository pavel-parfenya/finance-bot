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

@Entity("custom_categories")
export class CustomCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @Column()
  createdByUserId: number;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", default: "" })
  description: string;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: "workspaceId" })
  workspace: Workspace;

  @ManyToOne(() => User)
  @JoinColumn({ name: "createdByUserId" })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
