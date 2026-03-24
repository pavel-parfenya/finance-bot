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

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @Column()
  userId: number;

  /** Момент операции в UTC; в PostgreSQL колонка `datetime` (timestamptz). */
  @Column({ name: "datetime", type: "timestamptz" })
  occurredAt: Date;

  @Column({ type: "varchar" })
  description: string;

  @Column({ type: "varchar" })
  category: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 10 })
  currency: string;

  @Column({ type: "varchar" })
  store: string;

  @Column({ type: "varchar" })
  personDisplayName: string;

  @Column({ type: "varchar", length: 10, default: "expense" })
  type: string;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: "workspaceId" })
  workspace: Workspace;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
