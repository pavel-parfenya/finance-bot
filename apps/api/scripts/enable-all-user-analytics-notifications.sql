-- Включить все три уведомления аналитики у пользователей (прод: сначала бэкап и проверки ниже).
--
-- Бэкап (пример, подставь свой DATABASE_URL):
--   pg_dump "$DATABASE_URL" --schema=public --table=users -Fc -f users_backup_$(date +%Y%m%d).dump
-- или полный дамп БД по политике проекта.

-- ---------------------------------------------------------------------------
-- 1) Срез до изменений
-- ---------------------------------------------------------------------------
SELECT  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE archived IS TRUE) AS archived_users,
  COUNT(*) FILTER (WHERE archived IS NOT TRUE) AS not_archived_users,
  COUNT(*) FILTER (
    WHERE archived IS NOT TRUE
      AND analytics_reminder_eod IS TRUE
      AND analytics_month_report IS TRUE
      AND analytics_forecast_weekly IS TRUE
  ) AS already_all_on_not_archived,
  COUNT(*) FILTER (
    WHERE archived IS NOT TRUE
      AND (
        analytics_reminder_eod IS NOT TRUE
        OR analytics_month_report IS NOT TRUE
        OR analytics_forecast_weekly IS NOT TRUE
      )
  ) AS will_change_not_archived
FROM users;

-- Кого тронет обновление (только не архивные, у кого что-то ещё выключено) — первые 50 строк:
SELECT
  id,
  username,
  telegram_id,
  analytics_reminder_eod,
  analytics_month_report,
  analytics_forecast_weekly
FROM users
WHERE archived IS NOT TRUE
  AND (
    analytics_reminder_eod IS NOT TRUE
    OR analytics_month_report IS NOT TRUE
    OR analytics_forecast_weekly IS NOT TRUE
  )
ORDER BY id
LIMIT 50;

-- ---------------------------------------------------------------------------
-- 2) Пробный прогон: откат в конце (ничего не сохранится в БД)
-- ---------------------------------------------------------------------------
BEGIN;

UPDATE users
SET
  analytics_reminder_eod = true,
  analytics_month_report = true,
  analytics_forecast_weekly = true
WHERE archived IS NOT TRUE;

SELECT
  COUNT(*) FILTER (
    WHERE archived IS NOT TRUE
      AND analytics_reminder_eod IS TRUE
      AND analytics_month_report IS TRUE
      AND analytics_forecast_weekly IS TRUE
  ) AS not_archived_all_on_after_update
FROM users;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- 3) Реальное применение (выполни вручную после проверки шагов 1–2)
-- ---------------------------------------------------------------------------
BEGIN;

UPDATE users
SET
  analytics_reminder_eod = true,
  analytics_month_report = true,
  analytics_forecast_weekly = true
WHERE archived IS NOT TRUE;

SELECT COUNT(*) FROM users
WHERE archived IS NOT TRUE
  AND analytics_reminder_eod IS TRUE
  AND analytics_month_report IS TRUE
  AND analytics_forecast_weekly IS TRUE;

COMMIT;
-- при сомнениях: ROLLBACK;

-- ---------------------------------------------------------------------------
-- Вариант: включить у абсолютно всех строк users (включая archived)
-- ---------------------------------------------------------------------------
-- BEGIN;
-- UPDATE users
-- SET
--   analytics_reminder_eod = true,
--   analytics_month_report = true,
--   analytics_forecast_weekly = true;
-- ROLLBACK;
