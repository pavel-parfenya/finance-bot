import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Добавляет `bepaidSubscriptionId` и `bepaidPlanId` в subscriptions — связь с
 * подпиской bePaid для автопродления (bePaid сам списывает по расписанию плана и
 * шлёт notify-webhook). Имена колонок в camelCase и в кавычках, как требует схема
 * проекта (нет naming strategy, synchronize: false).
 *
 * Идемпотентно: добавляет колонки только если их ещё нет.
 */
export class AddBepaidSubscriptionColumns1750000000000 implements MigrationInterface {
  name = "AddBepaidSubscriptionColumns1750000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "bepaidSubscriptionId" VARCHAR
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "bepaidPlanId" VARCHAR
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      DROP COLUMN IF EXISTS "bepaidPlanId"
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      DROP COLUMN IF EXISTS "bepaidSubscriptionId"
    `);
  }
}
