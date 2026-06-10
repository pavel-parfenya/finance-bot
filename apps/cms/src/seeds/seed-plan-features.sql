-- Наполнение Strapi фичами тарифов и связями план→фичи.
-- Запуск: psql "$DATABASE_URL" -f apps/cms/src/seeds/seed-plan-features.sql
-- Идемпотентно (можно запускать повторно). Не трогает остальной контент.
--
-- Требует, чтобы Strapi хотя бы раз стартовал с коллекцией Feature и полями
-- planId/planFeatures у Pricing (тогда таблицы features / pricings_plan_features_lnk
-- и колонка pricings.plan_id уже созданы).

SET search_path = strapi, public;

-- ─── 1. Каталог фич (идемпотентно по key) ─────────────────────────────────────
INSERT INTO features (document_id, key, label, sort_order, published_at, created_at, updated_at)
SELECT gen_random_uuid()::text, v.key, v.label, v.ord, now(), now(), now()
FROM (VALUES
  ('voice_input',        'Голосовые сообщения', 0),
  ('advanced_analytics', 'Аналитика',           1),
  ('forecasts',          'Прогнозы трат',       2),
  ('debts',              'Долги',               3),
  ('collaborative',      'Совместный бюджет',   4)
) AS v(key, label, ord)
WHERE NOT EXISTS (SELECT 1 FROM features f WHERE f.key = v.key);

UPDATE features f
SET label = v.label, sort_order = v.ord, updated_at = now()
FROM (VALUES
  ('voice_input',        'Голосовые сообщения', 0),
  ('advanced_analytics', 'Аналитика',           1),
  ('forecasts',          'Прогнозы трат',       2),
  ('debts',              'Долги',               3),
  ('collaborative',      'Совместный бюджет',   4)
) AS v(key, label, ord)
WHERE f.key = v.key;

-- ─── 2. planId у тарифов (на всех строках: черновик + опубликованная) ─────────
UPDATE pricings SET plan_id = 'pro_month' WHERE plan_id IS NULL AND period = 'month';
UPDATE pricings SET plan_id = 'pro_year'  WHERE plan_id IS NULL AND period = 'year';
UPDATE pricings SET plan_id = 'free'      WHERE plan_id IS NULL AND (price = 0 OR lower(name) = 'free');

-- ─── 3. Связи план→фичи (идемпотентно: чистим и пересоздаём) ───────────────────
-- Free — без фич; Pro (месяц/год) — все 5. Линкуются и черновик, и published-строка.
DELETE FROM pricings_plan_features_lnk;

INSERT INTO pricings_plan_features_lnk (pricing_id, feature_id, feature_ord, pricing_ord)
SELECT
  p.id,
  f.id,
  (f.sort_order + 1)::double precision,
  row_number() OVER (PARTITION BY f.id ORDER BY p.id)::double precision
FROM pricings p
JOIN features f
  ON p.plan_id IN ('pro_month', 'pro_year')
 AND f.key IN ('voice_input', 'advanced_analytics', 'forecasts', 'debts', 'collaborative')
WHERE p.plan_id IS NOT NULL;
