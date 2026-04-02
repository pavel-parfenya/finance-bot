-- Снимки метрик пользователей приложения (по одному на календарный день UTC).

CREATE TABLE IF NOT EXISTS app_user_stats_snapshots (
  snapshot_date date PRIMARY KEY,
  total_users integer NOT NULL,
  empty_users integer NOT NULL,
  active_users integer NOT NULL,
  inactive_users integer NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);
