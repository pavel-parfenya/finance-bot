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

  /** Напоминание в ~20:00 локального времени, если нет трат за 24ч. */
  @Column({ name: "analytics_reminder_eod", type: "boolean", default: false })
  analyticsReminderEod: boolean;

  /** Развёрнутый отчёт в последний день месяца ~20:00 локально. */
  @Column({ name: "analytics_month_report", type: "boolean", default: false })
  analyticsMonthReport: boolean;

  /** Еженедельный прогноз (воскресенье ~20:00 локально). */
  @Column({ name: "analytics_forecast_weekly", type: "boolean", default: false })
  analyticsForecastWeekly: boolean;

  /** IANA, напр. Europe/Moscow; null — Europe/Moscow в коде. */
  @Column({ name: "analytics_timezone", type: "varchar", length: 64, nullable: true })
  analyticsTimezone: string | null;

  @Column({
    name: "last_analytics_reminder_local_date",
    type: "varchar",
    length: 10,
    nullable: true,
  })
  lastAnalyticsReminderLocalDate: string | null;

  @Column({
    name: "last_monthly_report_sent_ym",
    type: "varchar",
    length: 7,
    nullable: true,
  })
  lastMonthlyReportSentYm: string | null;

  @Column({
    name: "last_forecast_sent_local_date",
    type: "varchar",
    length: 10,
    nullable: true,
  })
  lastForecastSentLocalDate: string | null;

  /** Совпадает с последним INFO_CHANGELOG_VERSION, который пользователь «прочитал» в модалке инфо. */
  @Column({ type: "int", default: 0 })
  infoChangelogSeenVersion: number;

  @Column({ type: "varchar", length: 20, default: "official" })
  analyticsVoice: string;

  /**
   * Метка для статистики (недоставка / блок): не слать рассылки аналитики.
   * С ботом и приложением пользователь не ограничен — при следующем сообщении
   * findOrCreate снимает архив.
   */
  @Column({ type: "boolean", default: false })
  archived: boolean;

  /** yyyy-MM последнего «напоминания неактивным» в локале пользователя (последний день месяца). */
  @Column({
    name: "last_inactive_user_nudge_ym",
    type: "varchar",
    length: 7,
    nullable: true,
  })
  lastInactiveUserNudgeYm: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => WorkspaceMember, (m) => m.user)
  memberships: WorkspaceMember[];

  @OneToMany(() => Subscription, (s) => s.user)
  subscriptions: Subscription[];
}
