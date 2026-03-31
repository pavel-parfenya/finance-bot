-- Одноразовая миграция: date + time → одна колонка datetime (timestamptz, UTC).
-- Выполнить до деплоя кода с новой сущностью, если в таблице ещё есть date/time.
-- После миграции перезапустите приложение (synchronize выключен — схема только через миграции/SQL).

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "datetime" TIMESTAMPTZ;

UPDATE transactions
SET "datetime" = (
  (to_char("date", 'YYYY-MM-DD') || ' ' || "time")::timestamp AT TIME ZONE 'UTC'
)
WHERE "datetime" IS NULL
  AND "date" IS NOT NULL;

ALTER TABLE transactions ALTER COLUMN "datetime" SET NOT NULL;

ALTER TABLE transactions DROP COLUMN IF EXISTS "date";
ALTER TABLE transactions DROP COLUMN IF EXISTS "time";
