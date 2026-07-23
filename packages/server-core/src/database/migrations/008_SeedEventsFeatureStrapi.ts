import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Заводит фичу гейтинга `events` в Strapi (schema `strapi`): запись в каталоге
 * `features` + связь с тарифами PRO (`pro_month`/`pro_year`). Free остаётся без фич.
 *
 * Дублирует часть `apps/cms/src/seeds/seed-plan-features.sql`, но применяется
 * автоматически на шаге migrate при каждом деплое — чтобы новая фича попадала
 * в прод без ручного запуска seed.
 *
 * Идемпотентна. Если таблиц Strapi ещё нет (CMS ни разу не стартовала) — no-op,
 * сработает при следующем прогоне. На существующих окружениях таблицы есть.
 * Требует, чтобы у `pricings` уже была колонка `plan_id` (создаётся Strapi из
 * content-type pricing) — как и `seed-plan-features.sql`.
 */
export class SeedEventsFeatureStrapi1752100000000 implements MigrationInterface {
  name = "SeedEventsFeatureStrapi1752100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('strapi.features') IS NULL
           OR to_regclass('strapi.pricings') IS NULL
           OR to_regclass('strapi.pricings_plan_features_lnk') IS NULL THEN
          RAISE NOTICE 'Strapi tables not found — skip events feature seed';
          RETURN;
        END IF;

        -- Каталог: фича events (идемпотентно по key).
        INSERT INTO strapi.features (document_id, key, label, sort_order, published_at, created_at, updated_at)
        SELECT gen_random_uuid()::text, 'events', 'События', 5, now(), now(), now()
        WHERE NOT EXISTS (SELECT 1 FROM strapi.features WHERE key = 'events');

        -- planId у тарифов (на случай, если ещё не выведен).
        UPDATE strapi.pricings SET plan_id = 'pro_month' WHERE plan_id IS NULL AND period = 'month';
        UPDATE strapi.pricings SET plan_id = 'pro_year'  WHERE plan_id IS NULL AND period = 'year';
        UPDATE strapi.pricings SET plan_id = 'free'      WHERE plan_id IS NULL AND (price = 0 OR lower(name) = 'free');

        -- Связь events → все строки PRO-тарифов (черновик + опубликованная).
        INSERT INTO strapi.pricings_plan_features_lnk (pricing_id, feature_id, feature_ord, pricing_ord)
        SELECT p.id, f.id,
               (f.sort_order + 1)::double precision,
               row_number() OVER (ORDER BY p.id)::double precision
        FROM strapi.pricings p
        JOIN strapi.features f ON f.key = 'events'
        WHERE p.plan_id IN ('pro_month', 'pro_year')
        ON CONFLICT (pricing_id, feature_id) DO NOTHING;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('strapi.features') IS NULL THEN RETURN; END IF;
        DELETE FROM strapi.pricings_plan_features_lnk
          WHERE feature_id IN (SELECT id FROM strapi.features WHERE key = 'events');
        DELETE FROM strapi.features WHERE key = 'events';
      END $$;
    `);
  }
}
