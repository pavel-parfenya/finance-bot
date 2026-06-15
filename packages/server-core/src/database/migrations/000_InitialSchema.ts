import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Базовая схема (baseline). Исторически таблицы создавал `synchronize: true`,
 * а миграции 001–003 лишь дорабатывают `subscriptions`. На свежей БД (новый
 * docker volume) базовой схемы нет, поэтому 001 падал на
 * `ALTER TYPE subscriptions_plan_enum` — типа ещё не существует.
 *
 * Эта миграция создаёт схему в состоянии ДО 001 (исходные enum'ы free/pro и
 * active/expired/cancelled, `subscriptions` без startsAt/recurring/webpay/…),
 * чтобы цепочка 000→001→002→003 приводила к текущим entity.
 *
 * Полностью идемпотентна (CREATE TABLE IF NOT EXISTS + guarded CREATE TYPE):
 * - свежая БД: создаёт базу, дальше 001–003 эволюционируют её;
 * - существующая БД (прод): no-op, т.к. всё уже есть.
 *
 * Имена колонок — ровно как property в entity (нет naming strategy), camelCase
 * в кавычках; snake_case у тех колонок, где в entity есть `name:`.
 */
export class InitialSchema1748995100000 implements MigrationInterface {
  name = "InitialSchema1748995100000";

  private async createEnum(
    qr: QueryRunner,
    typeName: string,
    values: readonly string[]
  ): Promise<void> {
    const literals = values.map((v) => `'${v}'`).join(", ");
    await qr.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = '${typeName}'
        ) THEN
          CREATE TYPE "public"."${typeName}" AS ENUM(${literals});
        END IF;
      END $$;
    `);
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    // --- enum-типы (исходные значения, до 001) -----------------------------
    await this.createEnum(queryRunner, "subscriptions_plan_enum", ["free", "pro"]);
    await this.createEnum(queryRunner, "subscriptions_status_enum", [
      "active",
      "expired",
      "cancelled",
    ]);
    await this.createEnum(queryRunner, "workspace_members_role_enum", [
      "owner",
      "member",
    ]);
    await this.createEnum(queryRunner, "debts_status_enum", ["pending", "active"]);

    // --- users -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL NOT NULL,
        "telegramId" BIGINT NOT NULL,
        "username" VARCHAR,
        "defaultCurrency" VARCHAR(10),
        "analytics_reminder_eod" BOOLEAN NOT NULL DEFAULT false,
        "analytics_month_report" BOOLEAN NOT NULL DEFAULT false,
        "analytics_forecast_weekly" BOOLEAN NOT NULL DEFAULT false,
        "analytics_timezone" VARCHAR(64),
        "last_analytics_reminder_local_date" VARCHAR(10),
        "last_monthly_report_sent_ym" VARCHAR(7),
        "last_forecast_sent_local_date" VARCHAR(10),
        "infoChangelogSeenVersion" INTEGER NOT NULL DEFAULT 0,
        "analyticsVoice" VARCHAR(20) NOT NULL DEFAULT 'official',
        "archived" BOOLEAN NOT NULL DEFAULT false,
        "last_inactive_user_nudge_ym" VARCHAR(7),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_telegramId" UNIQUE ("telegramId")
      )
    `);

    // --- workspaces --------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspaces" (
        "id" SERIAL NOT NULL,
        "sheetId" VARCHAR NOT NULL,
        "title" VARCHAR NOT NULL,
        "ownerId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces_id" PRIMARY KEY ("id")
      )
    `);

    // --- workspace_members -------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_members" (
        "workspaceId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "role" "public"."workspace_members_role_enum" NOT NULL,
        "fullAccess" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_workspace_members" PRIMARY KEY ("workspaceId", "userId")
      )
    `);

    // --- subscriptions (состояние до 001) ----------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" SERIAL NOT NULL,
        "userId" INTEGER NOT NULL,
        "plan" "public"."subscriptions_plan_enum" NOT NULL DEFAULT 'free',
        "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'active',
        "expiresAt" TIMESTAMPTZ,
        "paymentId" VARCHAR,
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id")
      )
    `);

    // --- transactions ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id" SERIAL NOT NULL,
        "workspaceId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "datetime" TIMESTAMPTZ NOT NULL,
        "description" VARCHAR NOT NULL,
        "category" VARCHAR NOT NULL,
        "amount" NUMERIC(12,2) NOT NULL,
        "currency" VARCHAR(10) NOT NULL,
        "store" VARCHAR NOT NULL,
        "personDisplayName" VARCHAR NOT NULL,
        "type" VARCHAR(10) NOT NULL DEFAULT 'expense',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id")
      )
    `);

    // --- invitations -------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invitations" (
        "id" SERIAL NOT NULL,
        "workspaceId" INTEGER NOT NULL,
        "inviterId" INTEGER NOT NULL,
        "inviteeId" INTEGER NOT NULL,
        "status" VARCHAR NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitations_id" PRIMARY KEY ("id")
      )
    `);

    // --- debts -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "debts" (
        "id" SERIAL NOT NULL,
        "creatorUserId" INTEGER NOT NULL,
        "debtorUserId" INTEGER,
        "creditorUserId" INTEGER,
        "debtorName" VARCHAR NOT NULL,
        "creditorName" VARCHAR NOT NULL,
        "amount" NUMERIC(12,2) NOT NULL,
        "currency" VARCHAR(10) NOT NULL,
        "lentDate" DATE,
        "deadline" DATE,
        "repaidAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "status" "public"."debts_status_enum" NOT NULL DEFAULT 'active',
        "mainUserId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_debts_id" PRIMARY KEY ("id")
      )
    `);

    // --- custom_categories -------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "custom_categories" (
        "id" SERIAL NOT NULL,
        "workspaceId" INTEGER NOT NULL,
        "createdByUserId" INTEGER NOT NULL,
        "name" VARCHAR NOT NULL,
        "description" VARCHAR NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_categories_id" PRIMARY KEY ("id")
      )
    `);

    // --- app_user_stats_snapshots ------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_user_stats_snapshots" (
        "snapshot_date" DATE NOT NULL,
        "total_users" INTEGER NOT NULL,
        "empty_users" INTEGER NOT NULL,
        "active_users" INTEGER NOT NULL,
        "inactive_users" INTEGER NOT NULL,
        "archived_users" INTEGER NOT NULL DEFAULT 0,
        "computed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_user_stats_snapshots" PRIMARY KEY ("snapshot_date")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_user_stats_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "debts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workspaces"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."debts_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."workspace_members_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."subscriptions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."subscriptions_plan_enum"`);
  }
}
