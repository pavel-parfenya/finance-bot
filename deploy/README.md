# Деплой finance-bot на VPS

Образы собираются в **GitHub Actions** и пушатся в **GHCR**. Сервер ничего не собирает —
только тянет готовые образы и запускает их (`docker-compose.prod.yml`). HTTPS и
проксирование сабдоменов выполняет **host-nginx** сервера (Cloudflare Origin Certificate).

```
push в main ──▶ GitHub Actions ──▶ ghcr.io/pavel-parfenya/finance-bot-<svc> ──▶ SSH: pull + migrate + up
```

| URL | сервис | контейнер → loopback |
|---|---|---|
| `finance-bot.by` | landing (Next.js) | `127.0.0.1:3001` |
| `api.finance-bot.by` | NestJS API | `127.0.0.1:10000` |
| `app.finance-bot.by` | Mini App (Nuxt SSG) | `127.0.0.1:3000` |
| `bot.finance-bot.by` | Telegram bot | `127.0.0.1:10001` |
| `cms.finance-bot.by` | Strapi | `127.0.0.1:1337` |

У каждого сервиса есть `https://<host>/health.json` → `{"status":"ok",...}`.

Контейнеры публикуют порты **только на 127.0.0.1** — наружу их отдаёт host-nginx.

---

## 1. Разовый bootstrap сервера (`root@93.125.82.115`)

Многое уже сделано (docker, git-clone в `/opt/finance-bot`, host-nginx + Origin Cert).
Ниже — полный список; пропусти уже выполненное.

### 1.1 Docker / код / nginx — уже на месте
- Docker 29.x + compose v5 установлены.
- Репозиторий в `/opt/finance-bot`, ветка `main`.
- host-nginx активен, серт в `/etc/nginx/ssl/finance-bot.by/{cert.pem,key.pem}`.

### 1.2 Логин в GHCR (нужно, чтобы тянуть образы)
Создать PAT с правом **`read:packages`** (GitHub → Settings → Developer settings →
Personal access tokens):
```bash
echo <PAT> | docker login ghcr.io -u pavel-parfenya --password-stdin
```

### 1.3 `.env` (прод-конфиг, НЕ в репозитории)
На сервере уже есть `/opt/finance-bot/.env`. Убедиться, что заданы переменные для
прод-стека (раздел 2 ниже — что именно проверить/добавить).

### 1.4 nginx: добавить `bot.finance-bot.by`
Версионированный конфиг лежит в `deploy/nginx/`. Применить (одной из двух стратегий):

**Вариант A — синхронизировать из репозитория (рекомендуется):**
```bash
cd /opt/finance-bot && git pull --ff-only
cp deploy/nginx/snippets/*.conf /etc/nginx/snippets/
cp deploy/nginx/sites-available/finance-bot.conf /etc/nginx/sites-available/finance-bot.conf
ln -sf /etc/nginx/sites-available/finance-bot.conf /etc/nginx/sites-enabled/finance-bot.conf
nginx -t && systemctl reload nginx
```
> Конфиг добавляет блок `bot.finance-bot.by → 127.0.0.1:10001` и сабдомен `bot` в
> HTTP→HTTPS редирект. Серт и сниппеты совпадают с уже существующими на сервере.

### 1.5 DNS (Cloudflare, оранжевое облако = proxied)
A-запись `bot.finance-bot.by` → IP сервера (остальные сабдомены уже есть).
CF SSL mode = **Full (strict)**.

### 1.6 Первый запуск стека
```bash
cd /opt/finance-bot
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --wait postgres
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d
```

---

## 2. GitHub: секреты и переменные для CI

**Settings → Secrets and variables → Actions**

Secrets:
| Имя | Значение |
|---|---|
| `SSH_HOST` | `93.125.82.115` |
| `SSH_USER` | `root` |
| `SSH_KEY` | приватный SSH-ключ для входа на сервер |

Variables (инлайнятся в landing/miniapp при сборке; есть дефолты в workflow):
| Имя | Пример |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.finance-bot.by` |
| `NEXT_PUBLIC_BASE_URL` | `https://finance-bot.by` |
| `NEXT_PUBLIC_BOT_USERNAME` | `@your_bot` |
| `PAYMENT_MODE` | `paid` |

> GHCR-пуш в CI идёт под автоматическим `GITHUB_TOKEN` — отдельный секрет не нужен.
> Пакеты в GHCR по умолчанию приватные — серверу нужен `docker login` (см. 1.2).

---

## 3. `.env` на сервере — что должно быть задано

```env
# источник образов (дефолты совпадают с CI, можно не задавать)
REGISTRY=ghcr.io
IMAGE_PREFIX=pavel-parfenya/finance-bot
# TAG задаёт CI при деплое (github.sha); для ручного запуска: latest

# БД (контейнер postgres, общая для api/bot/cms)
DB_USER=finance
DB_PASSWORD=<надёжный-пароль>
DB_NAME=finance_bot
DATABASE_SSL=false

MODE=polling
PUBLIC_BASE_URL=https://api.finance-bot.by
PAYMENT_MODE=paid

TELEGRAM_BOT_TOKEN=<token>
DEEPSEEK_API_KEY=<key>
WHISPER_API_KEY=<key>
WHISPER_BASE_URL=https://api.groq.com/openai/v1

# Strapi-секреты
STRAPI_APP_KEYS=k1,k2,k3,k4
STRAPI_API_TOKEN_SALT=<random>
STRAPI_ADMIN_JWT_SECRET=<random>
BILLING_JWT_SECRET=<random>
INTERNAL_BOT_SECRET=<random>
```

---

## 4. Дальнейшие деплои

Полностью автоматически: **push в `main`** → CI собирает образы → пушит в GHCR →
по SSH на сервере `pull → up --wait postgres → run --rm migrate → up -d`.
Ручной перезапуск пайплайна: вкладка **Actions → Build & Deploy → Run workflow**.

### Миграции
Применяются на **каждом** деплое контейнером `migrate` (TypeORM `migration:run` +
`CREATE SCHEMA IF NOT EXISTS strapi`) ДО старта `api`/`bot`. Если миграция падает —
деплой обрывается, приложения не поднимаются на несовместимой схеме.

---

## 5. Бэкапы БД

Ежесуточный `pg_dump --format=custom` всей БД `finance_bot` (обе схемы: `public` + `strapi`)
в `/var/backups/finance-bot/`, с TTL — дампы старше `BACKUP_TTL_DAYS` (по умолчанию 7 суток)
удаляются после каждого успешного бэкапа. Скрипт и cron-файл версионируются в `deploy/backup/`
и копируются на сервер (по образцу nginx-конфигов):

```bash
cd /opt/finance-bot && git pull --ff-only
install -m 755 deploy/backup/pg-backup.sh /usr/local/bin/finance-bot-pg-backup
install -m 644 deploy/backup/finance-bot-backup.cron /etc/cron.d/finance-bot-backup
/usr/local/bin/finance-bot-pg-backup   # пробный прогон
```

Расписание — `30 3 * * *` (03:30 по времени сервера); TTL меняется правкой
`BACKUP_TTL_DAYS` в `/etc/cron.d/finance-bot-backup`. Лог: `/var/log/finance-bot-backup.log`.

> Дампы лежат на том же диске (9.8 ГБ), это защита от «уронили данные», а не от потери
> сервера. custom-формат уже сжат; при росте БД уменьшить TTL или выгружать наружу.

**Восстановление** (перезапишет текущие данные):
```bash
cd /opt/finance-bot
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U finance -d finance_bot --clean --if-exists \
  < /var/backups/finance-bot/finance_bot-<дата>.dump
```

---

## 6. Диагностика

```bash
cd /opt/finance-bot
docker compose -f docker-compose.prod.yml ps           # статусы
docker compose -f docker-compose.prod.yml logs -f api   # логи сервиса
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U finance -d finance_bot -c 'select name from migrations order by id desc limit 5;'

curl -s https://api.finance-bot.by/health.json
curl -s https://app.finance-bot.by/health.json
curl -s https://bot.finance-bot.by/health.json
curl -s https://cms.finance-bot.by/health.json
curl -sI https://finance-bot.by
```

**Память сервера (918 МБ):** сборка вынесена в CI, но рантайм пяти node-процессов + postgres
плотный. Должен быть включён swap (есть, 3 ГБ). Strapi ограничен `--max-old-space-size=512`
(в `docker-compose.prod.yml`).
