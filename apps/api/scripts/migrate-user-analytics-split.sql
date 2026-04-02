-- Раздельные флаги аналитики, таймзона, метки отправок (миграция с analytics_enabled).

ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_reminder_eod boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_month_report boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_forecast_weekly boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS analytics_timezone varchar(64) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_analytics_reminder_local_date varchar(10) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_monthly_report_sent_ym varchar(7) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_forecast_sent_local_date varchar(10) NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'analytics_enabled'
  ) THEN
    UPDATE users SET
      analytics_reminder_eod = COALESCE(analytics_enabled, false),
      analytics_month_report = COALESCE(analytics_enabled, false),
      analytics_forecast_weekly = COALESCE(analytics_enabled, false)
    WHERE analytics_enabled IS TRUE;
    ALTER TABLE users DROP COLUMN analytics_enabled;
  END IF;
END $$;
