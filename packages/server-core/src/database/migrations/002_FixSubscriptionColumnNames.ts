import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Миграция 001 добавила колонки в snake_case (starts_at, recurring_token, …),
 * тогда как entity Subscription и исходные колонки таблицы используют camelCase
 * (userId, expiresAt, paymentId). Из-за рассинхрона запросы TypeORM падали с
 * `column Subscription.startsAt does not exist`. Здесь приводим имена к camelCase.
 *
 * Переименования идемпотентны: выполняются только если snake-колонка есть, а
 * camel-колонки ещё нет (корректно и для уже мигрированной БД, и для свежей,
 * где 001 только что создал snake-колонки).
 */
export class FixSubscriptionColumnNames1748995300000 implements MigrationInterface {
  name = "FixSubscriptionColumnNames1748995300000";

  private static readonly RENAMES: ReadonlyArray<readonly [string, string]> = [
    ["starts_at", "startsAt"],
    ["recurring_token", "recurringToken"],
    ["webpay_order_id", "webpayOrderId"],
    ["webpay_recurring_id", "webpayRecurringId"],
    ["created_at", "createdAt"],
    ["updated_at", "updatedAt"],
  ];

  private async rename(qr: QueryRunner, from: string, to: string): Promise<void> {
    await qr.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'subscriptions' AND column_name = '${from}'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'subscriptions' AND column_name = '${to}'
        ) THEN
          ALTER TABLE "subscriptions" RENAME COLUMN "${from}" TO "${to}";
        END IF;
      END $$;
    `);
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [from, to] of FixSubscriptionColumnNames1748995300000.RENAMES) {
      await this.rename(queryRunner, from, to);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [from, to] of FixSubscriptionColumnNames1748995300000.RENAMES) {
      await this.rename(queryRunner, to, from);
    }
  }
}
