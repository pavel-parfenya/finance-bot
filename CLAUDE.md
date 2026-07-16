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
- `services/` — application services, **one folder per service** (see below): `payment/`, `subscription/`, `feature/`, `user/`, `workspace/`, `expense/`, `debt/`, etc.
- `repositories/` — TypeORM repositories (`TransactionRepository`, `DebtRepository`, etc.)
- `database/` — TypeORM `DataSource` factory + entities; `synchronize: false` (schema is managed manually)
- `analytics/` — transaction aggregation utilities with exchange-rate fetching
- `di/create-core-services.ts` — composition root; wires all services/repos together from a `Config` + `DataSource`

#### Service folder layout

Each service lives in its own folder under `services/<name>/` (folder name = service file without the `-service` suffix, e.g. `payment-service.ts` → `services/payment/`). Inside a folder, responsibilities are split by file suffix:

| File | Holds |
|---|---|
| `<name>-service.ts` | the class / application logic (the only required file) |
| `<name>-service.types.ts` | `interface` / `type` declarations for that service (no runtime code) |
| `<name>-service.utils.ts` | pure helpers + module-level constants used by the service |
| `<name>-service.test.ts` | the Vitest suite |

Rules:
- **No `index.ts` barrel inside the folder.** Import directly from the concrete file, e.g. `import { PaymentService } from "../payment/payment-service"` and `import type { CheckoutResult } from "../payment/payment-service.types"`.
- `.types.ts` / `.utils.ts` are created **only when there is content** — a single-file service is just `services/<name>/<name>-service.ts`. Don't add empty placeholder files.
- A type that is also a runtime value (a `class`, e.g. `PaymentError`) **stays in `-service.ts`** — `.types.ts` is declaration-only.
- The `-service.ts` file may `export type { … } from "./<name>-service.types"` so the public surface (and the `src/index.ts` barrel) can keep importing types from the service path; but the canonical definition lives in `.types.ts`.
- Reference: `services/payment/` is the worked example — `payment-service.ts` (logic) + `payment-service.types.ts` (`PaymentGatewayConfig`, `CheckoutResult`) + `payment-service.utils.ts` (order codec, bePaid state sets) + `payment-service.test.ts`.
- Standalone non-service modules (a bare helper function, not a class service — e.g. `inactive-user-nudge-qualifies.ts`) stay flat at `services/` root.
- The public package API is `src/index.ts` (barrel). External packages (`apps/api`, `apps/bot`) import only from `@finance-bot/server-core`, never from deep `services/**` paths — so moving a service folder only requires fixing the barrel + internal relative imports.

> The same folder-per-feature idea already applies in `apps/api`: each REST resource is a folder (`api/billing/`, `api/subscription/`, …) with its controller, `*-api.service.ts`, and a `dto/` subfolder of one-interface-per-file DTOs (`checkout.dto.ts`, `change-plan.dto.ts`).

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
| `META_CAPI_ACCESS_TOKEN` | Meta Conversions API token; empty = server-side events disabled |
| `META_PIXEL_ID` | Meta dataset id (defaults to the landing's pixel id) |

### Database

PostgreSQL via TypeORM. `synchronize: false` — never auto-syncs schema. Entities: `User`, `Workspace`, `WorkspaceMember`, `Subscription`, `Transaction`, `Invitation`, `Debt`, `CustomCategory`, `AppUserStatsSnapshot`.

**Column naming: camelCase.** There is **no** TypeORM naming strategy, so a column's DB name is exactly the entity property name (e.g. `userId`, `expiresAt`, `startsAt` — not `user_id`/`starts_at`). Because `synchronize: false`, the entity and the actual schema are only kept in sync by hand, so a mismatch silently compiles and only fails at query time (`column "X" does not exist`). Rules:

- New entity columns: keep the property name camelCase and do **not** add `name:` overrides — let the property name be the column name.
- Migrations that `ADD COLUMN` / `RENAME COLUMN` must quote camelCase identifiers, e.g. `ADD COLUMN "startsAt" TIMESTAMPTZ` (unquoted or snake_case will diverge from the entity). Migrations live in `packages/server-core/src/database/migrations/`; run with `npm run migrations` (`-w @finance-bot/server-core`).
- After changing an entity, verify the column exists with the same name in every environment before relying on it — the build will not catch the drift.

> Precedent: migration `002_FixSubscriptionColumnNames` renamed snake_case columns added by `001_ExtendSubscriptions` back to camelCase after `SubscriptionService` queries failed with `column Subscription.startsAt does not exist`.

### Testing

Tests use Vitest. Test files match `packages/**/*.test.ts` or `apps/**/*.test.ts`. The only existing test at the time of this writing is `packages/server-core/src/analytics/aggregate-transactions.test.ts`.
