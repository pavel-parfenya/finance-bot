import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Добавляет `adminSubscriptionNotifications` в users — тумблер уведомлений
 * супер-админу об оплаченных/отменённых подписках (читается только у админа,
 * см. AdminNotifyService). По умолчанию включено. Имя колонки в camelCase и в
 * кавычках, как требует схема проекта (нет naming strategy, synchronize: false).
 *
 * Идемпотентно: добавляет колонку только если её ещё нет.
 */
export class AddUserAdminSubscriptionNotifications1752000000000 implements MigrationInterface {
  name = "AddUserAdminSubscriptionNotifications1752000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "adminSubscriptionNotifications" BOOLEAN NOT NULL DEFAULT TRUE
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "adminSubscriptionNotifications"
    `);
  }
}
