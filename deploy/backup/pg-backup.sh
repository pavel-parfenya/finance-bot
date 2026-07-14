#!/bin/sh
# Ежесуточный бэкап PostgreSQL (pg_dump --format=custom) с TTL-очисткой старых дампов.
#
# Версионируется в deploy/backup/, ставится на сервер в /usr/local/bin/finance-bot-pg-backup
# (вне git-клона, чтобы не пачкать рабочее дерево на сервере — по образцу deploy/nginx/).
# Запускается кроном из /etc/cron.d/finance-bot-backup (см. deploy/backup/finance-bot-backup.cron
# и раздел «Бэкапы БД» в deploy/README.md).
#
# Дамп снимается ИЗНУТРИ контейнера postgres (compose exec -T): хостовый pg_dump не нужен,
# версия клиента всегда совпадает с сервером, а креды не читаются из .env на хосте —
# контейнер уже знает POSTGRES_USER/POSTGRES_DB. Дамп покрывает обе схемы (public + strapi).
#
# Настройки через окружение (задаются в cron-файле):
#   COMPOSE_DIR      где лежит docker-compose.prod.yml (default /opt/finance-bot)
#   BACKUP_DIR       куда складывать дампы            (default /var/backups/finance-bot)
#   BACKUP_TTL_DAYS  сколько суток хранить дампы      (default 7)
set -eu

COMPOSE_DIR=${COMPOSE_DIR:-/opt/finance-bot}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/finance-bot}
BACKUP_TTL_DAYS=${BACKUP_TTL_DAYS:-7}

mkdir -p "$BACKUP_DIR"
cd "$COMPOSE_DIR"

target="$BACKUP_DIR/finance_bot-$(date +%Y-%m-%d_%H%M%S).dump"

# Сначала во временный файл: оборванный дамп (упавший pg_dump, нехватка места)
# не должен выглядеть валидным бэкапом и «омолаживать» ротацию.
tmp="$target.part"
trap 'rm -f "$tmp"' EXIT

docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'exec pg_dump -U "$POSTGRES_USER" --format=custom "$POSTGRES_DB"' > "$tmp"

# custom-формат не бывает нулевым; защита от «тихо получили 0 байт»
[ -s "$tmp" ] || { echo "backup is empty: $tmp" >&2; exit 1; }

mv "$tmp" "$target"
trap - EXIT

# TTL: удалить дампы старше BACKUP_TTL_DAYS суток
find "$BACKUP_DIR" -name 'finance_bot-*.dump' -type f -mtime +"$BACKUP_TTL_DAYS" -delete

echo "$(date -Is) OK $target ($(du -h "$target" | cut -f1))"
