import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendSubscriptions1748995200000 implements MigrationInterface {
  name = "ExtendSubscriptions1748995200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate plan enum: free/pro → free/pro_month/pro_year
    await queryRunner.query(`
      ALTER TYPE "public"."subscriptions_plan_enum"
      RENAME TO "subscriptions_plan_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_plan_enum"
      AS ENUM('free', 'pro_month', 'pro_year')
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "plan" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "plan" TYPE "public"."subscriptions_plan_enum"
      USING CASE "plan"::text
        WHEN 'pro' THEN 'pro_month'
        ELSE "plan"::text
      END::"public"."subscriptions_plan_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "plan" SET DEFAULT 'free'
    `);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_plan_enum_old"`);

    // Migrate status enum: add past_due, rename cancelled → canceled
    await queryRunner.query(`
      ALTER TYPE "public"."subscriptions_status_enum"
      RENAME TO "subscriptions_status_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_status_enum"
      AS ENUM('active', 'canceled', 'expired', 'past_due')
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "status" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "status" TYPE "public"."subscriptions_status_enum"
      USING CASE "status"::text
        WHEN 'cancelled' THEN 'canceled'
        ELSE "status"::text
      END::"public"."subscriptions_status_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "status" SET DEFAULT 'active'
    `);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum_old"`);

    // Add new columns
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "recurring_token" VARCHAR
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "webpay_order_id" VARCHAR
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "webpay_recurring_id" VARCHAR
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "starts_at"`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "recurring_token"`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "webpay_order_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "webpay_recurring_id"`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "created_at"`
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "updated_at"`
    );

    // Revert status enum (drop past_due, keep cancelled spelling)
    await queryRunner.query(`
      ALTER TYPE "public"."subscriptions_status_enum"
      RENAME TO "subscriptions_status_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_status_enum"
      AS ENUM('active', 'expired', 'cancelled')
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "status" TYPE "public"."subscriptions_status_enum"
      USING CASE "status"::text
        WHEN 'canceled' THEN 'cancelled'
        WHEN 'past_due' THEN 'active'
        ELSE "status"::text
      END::"public"."subscriptions_status_enum"
    `);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum_old"`);

    // Revert plan enum
    await queryRunner.query(`
      ALTER TYPE "public"."subscriptions_plan_enum"
      RENAME TO "subscriptions_plan_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_plan_enum"
      AS ENUM('free', 'pro')
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "plan" TYPE "public"."subscriptions_plan_enum"
      USING CASE "plan"::text
        WHEN 'pro_month' THEN 'pro'
        WHEN 'pro_year' THEN 'pro'
        ELSE "plan"::text
      END::"public"."subscriptions_plan_enum"
    `);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_plan_enum_old"`);
  }
}
