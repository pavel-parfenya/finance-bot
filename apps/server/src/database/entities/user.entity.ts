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

  @Column({ type: "varchar", length: 10, nullable: true })
  defaultCurrency: string | null;

  @Column({ type: "boolean", default: false })
  analyticsEnabled: boolean;

  /** Совпадает с последним INFO_CHANGELOG_VERSION, который пользователь «прочитал» в модалке инфо. */
  @Column({ type: "int", default: 0 })
  infoChangelogSeenVersion: number;

  @Column({ type: "varchar", length: 20, default: "official" })
  analyticsVoice: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => WorkspaceMember, (m) => m.user)
  memberships: WorkspaceMember[];

  @OneToMany(() => Subscription, (s) => s.user)
  subscriptions: Subscription[];
}
