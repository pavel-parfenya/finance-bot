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

  /**
   * Идентификатор подписки bePaid (`sbs_…`). По нему bePaid сам списывает оплату
   * по расписанию плана и шлёт notify-webhook при каждом продлении; используется
   * для отмены автопродления (`POST /subscriptions/{id}/cancel`).
   */
  @Column({ type: "varchar", nullable: true })
  bepaidSubscriptionId: string | null;

  /** Идентификатор плана bePaid (`pln_…`), к которому привязана подписка. */
  @Column({ type: "varchar", nullable: true })
  bepaidPlanId: string | null;

  /**
   * Момент гашения ссылки на оплату. Billing-JWT с `iat <= linkRevokedAt`
   * считается использованным (одноразовость ссылки `/subscribe`). Ставится при
   * успешной активации платного тарифа.
   */
  @Column({ type: "timestamptz", nullable: true })
  linkRevokedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => User, (u) => u.subscriptions)
  @JoinColumn({ name: "userId" })
  user: User;
}
