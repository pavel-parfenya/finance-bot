import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { WorkspaceMember } from "./workspace-member.entity";

@Entity("workspaces")
export class Workspace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  sheetId: string;

  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "int" })
  ownerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "ownerId" })
  owner: User;

  @OneToMany(() => WorkspaceMember, (m) => m.workspace)
  members: WorkspaceMember[];

  @CreateDateColumn()
  createdAt: Date;
}
