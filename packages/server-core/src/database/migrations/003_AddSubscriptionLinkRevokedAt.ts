import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Добавляет `linkRevokedAt` в subscriptions — момент гашения ссылки на оплату
 * (одноразовость billing-JWT `/subscribe`). Имя колонки в camelCase и в кавычках,
 * как требует схема проекта (нет naming strategy, synchronize: false).
 *
 * Идемпотентно: добавляет колонку только если её ещё нет.
 */
export class AddSubscriptionLinkRevokedAt1749000000000 implements MigrationInterface {
  name = "AddSubscriptionLinkRevokedAt1749000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "linkRevokedAt" TIMESTAMPTZ
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      DROP COLUMN IF EXISTS "linkRevokedAt"
    `);
  }
}
