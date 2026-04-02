-- Архив (бот заблокирован), дедуп ежемесячного напоминания неактивным.

ALTER TABLE users ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_inactive_user_nudge_ym varchar(7) NULL;

-- Снимки статистики: счётчик архивных аккаунтов.

ALTER TABLE app_user_stats_snapshots ADD COLUMN IF NOT EXISTS archived_users integer NOT NULL DEFAULT 0;
