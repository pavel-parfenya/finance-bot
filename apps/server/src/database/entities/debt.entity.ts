import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum DebtStatus {
  Pending = "pending", // ожидает подтверждения от второй стороны
  Active = "active", // подтверждён или без связи
}

@Entity("debts")
export class Debt {
  @PrimaryGeneratedColumn()
  id: number;

  /** Кто создал запись (отправил сообщение) */
  @Column()
  creatorUserId: number;

  /** Кто должен (должник). null = не привязан, смотреть debtorName */
  @Column({ nullable: true })
  debtorUserId: number | null;

  /** Кому должны (кредитор). null = не привязан */
  @Column({ nullable: true })
  creditorUserId: number | null;

  @Column({ type: "varchar" })
  debtorName: string;

  @Column({ type: "varchar" })
  creditorName: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 10 })
  currency: string;

  @Column({ type: "date", nullable: true })
  lentDate: Date | null;

  @Column({ type: "date", nullable: true })
  deadline: Date | null;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  repaidAmount: number;

  @Column({ type: "enum", enum: DebtStatus, default: DebtStatus.Active })
  status: DebtStatus;

  /** Кто может редактировать: кредитор (кто одолжил). Если не привязан — creator */
  @Column()
  mainUserId: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "creatorUserId" })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "debtorUserId" })
  debtor: User | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "creditorUserId" })
  creditor: User | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "mainUserId" })
  mainUser: User;
}
