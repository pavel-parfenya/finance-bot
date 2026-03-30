import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";

export enum SubscriptionPlan {
  Free = "free",
  Pro = "pro",
}

export enum SubscriptionStatus {
  Active = "active",
  Expired = "expired",
  Cancelled = "cancelled",
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
  expiresAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  paymentId: string | null;

  @ManyToOne(() => User, (u) => u.subscriptions)
  @JoinColumn({ name: "userId" })
  user: User;
}
