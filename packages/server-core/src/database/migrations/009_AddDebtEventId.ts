import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Связь долга с событием: `debts."eventId"`. Заполняется при создании долга из
 * расчёта события («распил») — нужно, чтобы понимать, по какой строке расчёта
 * долг уже создан (и блокировать повторное создание), и переживало перезагрузку.
 *
 * Идемпотентна (ADD COLUMN IF NOT EXISTS). camelCase-идентификатор в кавычках.
 */
export class AddDebtEventId1752200000000 implements MigrationInterface {
  name = "AddDebtEventId1752200000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "eventId" INTEGER`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_debts_eventId" ON "debts" ("eventId")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_debts_eventId"`);
    await queryRunner.query(`ALTER TABLE "debts" DROP COLUMN IF EXISTS "eventId"`);
  }
}
