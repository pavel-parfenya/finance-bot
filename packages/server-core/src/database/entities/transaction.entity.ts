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
import { Event } from "./event.entity";

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  workspaceId: number;

  @Column({ type: "int" })
  userId: number;

  /** Событие, к которому привязана трата (null — обычная трата). */
  @Column({ type: "int", nullable: true })
  eventId: number | null;

  /** Исключена ли трата из расчёта события («распила»). */
  @Column({ type: "boolean", default: false })
  excludedFromEvent: boolean;

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

  @ManyToOne(() => Event)
  @JoinColumn({ name: "eventId" })
  event: Event | null;

  @CreateDateColumn()
  createdAt: Date;
}
