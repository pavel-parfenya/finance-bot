# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (all apps simultaneously)
npm run dev

# Individual apps
npm run dev:api      # NestJS API
npm run dev:bot      # Telegram bot (tsx watch)
npm run dev:client   # Nuxt 3 Mini App

# Build
npm run build        # All apps in dependency order
npm run build:api    # shared → server-core → bot → api
npm run build:bot    # shared → server-core → bot

# Tests
npm test             # vitest run (once)
npm run test:watch   # vitest watch mode

# Lint / format
npm run lint
npm run lint:fix
npm run format
```

## Architecture

This is an npm workspaces monorepo with three apps and two shared packages:

```
packages/shared          # @finance-bot/shared — shared types/utils (no Node deps)
packages/server-core     # @finance-bot/server-core — all backend logic
apps/api                 # NestJS HTTP API
apps/bot                 # Telegram bot process (grammY)
apps/client              # Nuxt 3 Telegram Mini App (SSG, served by API)
```

### Dependency graph

`shared` ← `server-core` ← `api` + `bot`; `client` depends only on `shared`.

### `packages/server-core` — the heart of the backend

All domain logic, services, infrastructure implementations, and the TypeORM `DataSource` live here. Both `apps/api` and `apps/bot` import from it.

- `domain/` — interfaces and models (zero external dependencies)
- `infrastructure/` — DeepSeek (LLM parsing), Whisper (STT)
- `services/` — application services: `UserService`, `WorkspaceService`, `ExpenseService`, `DebtService`, `AnalyticsInsightService`, `AppStatsService`, etc.
- `repositories/` — TypeORM repositories (`TransactionRepository`, `DebtRepository`, etc.)
- `database/` — TypeORM `DataSource` factory + entities; `synchronize: false` (schema is managed manually)
- `analytics/` — transaction aggregation utilities with exchange-rate fetching
- `di/create-core-services.ts` — composition root; wires all services/repos together from a `Config` + `DataSource`

### `apps/api` — NestJS process

Serves the REST API (`/api/…`), serves the Nuxt static build at `/app`, and optionally embeds the Telegram bot webhook (`MODE=webhook`, `EMBED_TELEGRAM_BOT=true`). NestJS providers are thin factories that delegate to singleton instances created by `createCoreServices()` via `getApiContainer()`.

### `apps/bot` — standalone bot process

Runs grammY in polling or webhook mode. Entrypoint is `src/main.ts`. The bot is assembled in `src/bot/bot.ts` via `createBot()`, which wires all command/callback handlers. Analytics cron jobs live in `src/bot/analytics-cron.ts`.

### Deployment modes

- **Single process (Render default):** `apps/api` runs with `MODE=webhook` + `EMBED_TELEGRAM_BOT=true`. The bot runs inside the API process; `apps/bot` process is not started.
- **Dual process:** `apps/api` and `apps/bot` run separately. `EMBED_TELEGRAM_BOT=false`; API sets `BOT_SERVICE_URL` to forward internal Telegram sends to the bot service.

### Environment variables

A single `.env` file at the repo root is loaded by both apps. Per-app overrides go in `apps/api/.env` and `apps/bot/.env`. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `TELEGRAM_BOT_TOKEN` | grammY bot token |
| `DEEPSEEK_API_KEY` | LLM for expense/debt parsing |
| `WHISPER_API_KEY` / `WHISPER_BASE_URL` | STT (default: Groq) |
| `PUBLIC_BASE_URL` / `RENDER_EXTERNAL_URL` | Mini App base URL |
| `MODE` | `polling` (default) or `webhook` |
| `EMBED_TELEGRAM_BOT` | `true` to run bot inside API process |

### Database

PostgreSQL via TypeORM. `synchronize: false` — never auto-syncs schema. Entities: `User`, `Workspace`, `WorkspaceMember`, `Subscription`, `Transaction`, `Invitation`, `Debt`, `CustomCategory`, `AppUserStatsSnapshot`.

### Testing

Tests use Vitest. Test files match `packages/**/*.test.ts` or `apps/**/*.test.ts`. The only existing test at the time of this writing is `packages/server-core/src/analytics/aggregate-transactions.test.ts`.
