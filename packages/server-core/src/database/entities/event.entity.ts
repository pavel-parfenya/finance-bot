import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import type { EventSettlementRow } from "@finance-bot/shared-types";

export enum EventStatus {
  Active = "active",
  Settled = "settled",
}

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", default: "" })
  description: string;

  /** Ключевые слова для распознавания трат события через LLM. */
  @Column({ type: "varchar", default: "" })
  keywords: string;

  @Column({ type: "int" })
  creatorUserId: number;

  @Column({ type: "varchar", length: 10 })
  currency: string;

  @Column({ type: "varchar", length: 20, default: EventStatus.Active })
  status: EventStatus;

  /** Сохранённый результат расчёта (после «Завершить и рассчитать»). */
  @Column({ type: "jsonb", nullable: true })
  settlement: EventSettlementRow[] | null;

  @Column({ type: "timestamptz", nullable: true })
  settledAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "creatorUserId" })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;
}
