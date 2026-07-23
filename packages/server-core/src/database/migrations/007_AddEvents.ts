import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Фича «События» (events): совместный учёт трат группы на общее мероприятие
 * с последующим авто-распределением.
 *
 * - `events` — само событие (создатель, валюта, статус, сохранённый расчёт).
 * - `event_members` — участники события (композитный PK eventId+userId).
 * - `event_invitations` — приглашения (по образцу `invitations`).
 * - `transactions."eventId"` / `"excludedFromEvent"` — привязка траты к событию
 *   и флаг исключения из расчёта.
 *
 * Идемпотентна (CREATE TABLE/ADD COLUMN IF NOT EXISTS). camelCase-идентификаторы
 * в кавычках (нет naming strategy). `status`/`role` хранятся как VARCHAR (как в
 * entity), без enum-типов Postgres.
 */
export class AddEvents1752000000000 implements MigrationInterface {
  name = "AddEvents1752000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // --- events ------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" SERIAL NOT NULL,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR NOT NULL DEFAULT '',
        "keywords" VARCHAR NOT NULL DEFAULT '',
        "creatorUserId" INTEGER NOT NULL,
        "currency" VARCHAR(10) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'active',
        "settlement" JSONB,
        "settledAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id")
      )
    `);

    // --- event_members -----------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "event_members" (
        "eventId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "role" VARCHAR(10) NOT NULL DEFAULT 'member',
        CONSTRAINT "PK_event_members" PRIMARY KEY ("eventId", "userId")
      )
    `);

    // --- event_invitations -------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "event_invitations" (
        "id" SERIAL NOT NULL,
        "eventId" INTEGER NOT NULL,
        "inviterId" INTEGER NOT NULL,
        "inviteeId" INTEGER NOT NULL,
        "status" VARCHAR NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_invitations_id" PRIMARY KEY ("id")
      )
    `);

    // --- transactions: привязка к событию ----------------------------------
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "eventId" INTEGER`
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "excludedFromEvent" BOOLEAN NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_eventId" ON "transactions" ("eventId")`
    );

    // --- debts: комментарий (для «Долг за событие …») ----------------------
    await queryRunner.query(
      `ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "comment" VARCHAR`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "debts" DROP COLUMN IF EXISTS "comment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_eventId"`);
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN IF EXISTS "excludedFromEvent"`
    );
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "eventId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
  }
}
