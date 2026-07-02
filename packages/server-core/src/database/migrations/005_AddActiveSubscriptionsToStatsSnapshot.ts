import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Добавляет `active_subscriptions` в app_user_stats_snapshots — число активных
 * платных подписок на конец UTC-дня (ещё одна линия на графике статистики).
 *
 * Идемпотентно. Уже сохранённые прошлые снимки останутся с 0 (историю за них не
 * реконструируем); значение заполняется новыми снимками (cron 23:59 UTC и
 * дозаполнение отсутствующих прошлых дней).
 */
export class AddActiveSubscriptionsToStatsSnapshot1750000000001 implements MigrationInterface {
  name = "AddActiveSubscriptionsToStatsSnapshot1750000000001";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_user_stats_snapshots"
      ADD COLUMN IF NOT EXISTS "active_subscriptions" INTEGER NOT NULL DEFAULT 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_user_stats_snapshots"
      DROP COLUMN IF EXISTS "active_subscriptions"
    `);
  }
}
