import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { WorkspaceMember } from "./workspace-member.entity";
import { Subscription } from "./subscription.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "bigint", unique: true })
  telegramId: number;

  @Column({ type: "varchar", nullable: true })
  username: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => WorkspaceMember, (m) => m.user)
  memberships: WorkspaceMember[];

  @OneToMany(() => Subscription, (s) => s.user)
  subscriptions: Subscription[];
}
