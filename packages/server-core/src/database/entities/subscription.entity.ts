import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum SubscriptionPlan {
  Free = "free",
  ProMonth = "pro_month",
  ProYear = "pro_year",
}

export enum SubscriptionStatus {
  Active = "active",
  Canceled = "canceled",
  Expired = "expired",
  PastDue = "past_due",
}

@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "enum", enum: SubscriptionPlan, default: SubscriptionPlan.Free })
  plan: SubscriptionPlan;

  @Column({ type: "enum", enum: SubscriptionStatus, default: SubscriptionStatus.Active })
  status: SubscriptionStatus;

  @Column({ type: "timestamptz", nullable: true })
  startsAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  paymentId: string | null;

  @Column({ type: "varchar", nullable: true })
  recurringToken: string | null;

  @Column({ type: "varchar", nullable: true })
  webpayOrderId: string | null;

  @Column({ type: "varchar", nullable: true })
  webpayRecurringId: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => User, (u) => u.subscriptions)
  @JoinColumn({ name: "userId" })
  user: User;
}
