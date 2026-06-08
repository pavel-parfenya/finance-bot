# Roadmap по спринтам

> Каждый спринт описан как самодостаточная инструкция — можно начать реализацию без контекста предыдущего разговора.

---

## Контекст проекта (читать перед каждым спринтом)

**Проект:** finance-bot — Telegram бот учёта финансов с распознаванием голосовых сообщений.  
**Монорепо:** npm workspaces → мигрируем на Turborepo (Sprint 1).  
**БД:** PostgreSQL + TypeORM, `synchronize: false`. Миграции через TypeORM CLI (`npm run migrations`).  
**Домен:** valentinethebuhgalter.by  
**Бренд:** уточняется, везде писать placeholder `[BRAND_NAME]`  
**Реквизиты:** будут заполнены через CMS позже, placeholder `[UНП]`, `[ADDRESS]`, `[PHONE]`, `[EMAIL]`

---

## Sprint 1 — Turborepo + Subscription + Landing + Strapi

### Цель

Инфраструктура готова: Turborepo, расширенная модель подписок, публичный лендинг, CMS.

### Что НЕ трогать

- Всю логику бота (`apps/bot`) — только переименовывать пути, не менять код
- Всю логику API (`apps/api`) — только обновлять импорты
- Таблицы в БД, кроме `subscriptions`

---

### Шаг 1.1 — Turborepo

**Установить Turborepo в корне:**

```bash
npm install turbo --save-dev -w
```

**Создать `turbo.json` в корне:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".output/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Обновить корневой `package.json` — заменить scripts:**

```json
"scripts": {
  "dev": "turbo dev",
  "build": "turbo build",
  "build:api": "turbo build --filter=apps-api...",
  "build:bot": "turbo build --filter=apps-bot...",
  "lint": "turbo lint",
  "test": "turbo test",
  "migrations": "npm run migrations -w @finance-bot/server-core"
}
```

---

### Шаг 1.2 — Разделить packages/shared

**Текущая структура:** `packages/shared` — один пакет с типами и утилитами.  
**Новая структура:** два пакета.

**Создать `packages/shared-types/`** — только TypeScript интерфейсы/типы, без Node.js deps:

```
packages/shared-types/
├── src/
│   └── index.ts      # re-export всех типов из packages/shared/src/
├── package.json
└── tsconfig.json
```

`package.json`:
```json
{
  "name": "@finance-bot/shared-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc", "dev": "tsc --watch" }
}
```

**Создать `packages/shared-utils/`** — утилиты (могут иметь Node deps):

```
packages/shared-utils/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

**Обновить импорты:**
- `apps/client` → переименовать в `apps/miniapp`, обновить `package.json` name на `apps-miniapp`
- Все `@finance-bot/shared` → `@finance-bot/shared-types` или `@finance-bot/shared-utils` по смыслу
- `apps/api/package.json`, `apps/bot/package.json`, `apps/miniapp/package.json` — обновить зависимости
- Старый `packages/shared` можно оставить временно как re-export для обратной совместимости

---

### Шаг 1.3 — TypeORM CLI миграции

**Создать `packages/server-core/src/database/data-source.cli.ts`:**

```typescript
import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { User } from "./entities/user.entity";
import { Workspace } from "./entities/workspace.entity";
import { WorkspaceMember } from "./entities/workspace-member.entity";
import { Subscription } from "./entities/subscription.entity";
import { Transaction } from "./entities/transaction.entity";
import { Invitation } from "./entities/invitation.entity";
import { Debt } from "./entities/debt.entity";
import { CustomCategory } from "./entities/custom-category.entity";
import { AppUserStatsSnapshot } from "./entities/app-user-stats-snapshot.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [User, Workspace, WorkspaceMember, Subscription, Transaction, Invitation, Debt, CustomCategory, AppUserStatsSnapshot],
  migrations: [path.join(__dirname, "migrations/*.ts")],
  synchronize: false,
});
```

**Добавить в `packages/server-core/package.json`:**

```json
"scripts": {
  "build": "tsc",
  "migrations": "typeorm-ts-node-commonjs -d src/database/data-source.cli.ts migration:run",
  "migrations:generate": "typeorm-ts-node-commonjs -d src/database/data-source.cli.ts migration:generate",
  "migrations:revert": "typeorm-ts-node-commonjs -d src/database/data-source.cli.ts migration:revert"
}
```

**Создать директорию:** `packages/server-core/src/database/migrations/`

---

### Шаг 1.4 — Расширить Subscription entity

**Файл:** `packages/server-core/src/database/entities/subscription.entity.ts`

**Финальный вид:**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn
} from "typeorm";
import { User } from "./user.entity";

export enum SubscriptionPlan {
  Free = "free",
  ProMonth = "pro_month",
  ProYear = "pro_year",
}

export enum SubscriptionStatus {
  Active = "active",
  Canceled = "canceled",
  Expired = "expired",
  PastDue = "past_due",
}

@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "enum", enum: SubscriptionPlan, default: SubscriptionPlan.Free })
  plan: SubscriptionPlan;

  @Column({ type: "enum", enum: SubscriptionStatus, default: SubscriptionStatus.Active })
  status: SubscriptionStatus;

  @Column({ type: "timestamptz", nullable: true })
  startsAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  paymentId: string | null;

  @Column({ type: "varchar", nullable: true })
  recurringToken: string | null;

  @Column({ type: "varchar", nullable: true })
  webpayOrderId: string | null;

  @Column({ type: "varchar", nullable: true })
  webpayRecurringId: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => User, (u) => u.subscriptions)
  @JoinColumn({ name: "userId" })
  user: User;
}
```

**Создать миграцию `packages/server-core/src/database/migrations/001_extend_subscriptions.ts`:**

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendSubscriptions1000000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Обновить enum subscription_plan_enum
    await queryRunner.query(`ALTER TYPE "subscription_plan_enum" RENAME TO "subscription_plan_enum_old"`);
    await queryRunner.query(`CREATE TYPE "subscription_plan_enum" AS ENUM('free', 'pro_month', 'pro_year')`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "plan" TYPE "subscription_plan_enum" USING "plan"::text::"subscription_plan_enum"`);
    await queryRunner.query(`DROP TYPE "subscription_plan_enum_old"`);

    // Обновить enum subscription_status_enum
    await queryRunner.query(`ALTER TYPE "subscription_status_enum" RENAME TO "subscription_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "subscription_status_enum" AS ENUM('active', 'canceled', 'expired', 'past_due')`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE "subscription_status_enum" USING
      CASE "status"::text
        WHEN 'cancelled' THEN 'canceled'::text
        ELSE "status"::text
      END::"subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE "subscription_status_enum_old"`);

    // Добавить новые колонки
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "recurring_token" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "webpay_order_id" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "webpay_recurring_id" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "starts_at"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "recurring_token"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "webpay_order_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "webpay_recurring_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "created_at"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "updated_at"`);
    // Возврат enum оставить как есть (нет смысла откатывать переименование cancelled→canceled)
  }
}
```

---

### Шаг 1.5 — Landing (apps/landing)

**Инициализировать Next.js приложение:**

```bash
cd apps && npx create-next-app@latest landing --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

**Структура страниц:**

```
apps/landing/
├── app/
│   ├── layout.tsx            # Header + Footer + шрифты
│   ├── page.tsx              # / — Hero + Features + CTA
│   ├── pricing/page.tsx      # Тарифы
│   ├── faq/page.tsx          # FAQ
│   ├── contacts/page.tsx     # Контакты + реквизиты компании
│   ├── payment/page.tsx      # Способы оплаты
│   ├── refund/page.tsx       # Политика возврата
│   ├── privacy/page.tsx      # Политика конфиденциальности
│   └── offer/page.tsx        # Публичная оферта
├── components/
│   ├── Header.tsx
│   └── Footer.tsx
└── package.json              # name: "apps-landing"
```

**Дизайн-гайд:**
- Цвета: белый фон, чёрный текст, акцент — один цвет (например `indigo-600`)
- Типографика: системный шрифт или Inter
- Hero секция: крупный заголовок "Учёт расходов голосом", подзаголовок про бот, иконка микрофона или GIF демо
- Никаких сложных анимаций, минимум блоков

**Контент pricing страницы (placeholder):**
- Free: 0 руб/мес — базовый учёт, текстовые сообщения
- Pro Month: [PRICE] руб/мес — голосовые сообщения, аналитика, AI-парсинг
- Pro Year: [PRICE] руб/год — всё из Pro + скидка [X]%

**Добавить в `package.json` landing:**
```json
{
  "name": "apps-landing",
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint"
  }
}
```

---

### Шаг 1.6 — CMS Strapi v5 (apps/cms)

**Инициализировать:**

```bash
cd apps && npx create-strapi@5 cms --typescript --no-run
```

**Content Types для создания через Strapi Admin (или через schema файлы):**

1. **Page** (Collection Type)
   - `title` String (required)
   - `slug` UID (from title, required, unique)
   - `content` Rich Text
   - `seoTitle` String
   - `seoDescription` Text

2. **FAQ** (Collection Type)
   - `question` String (required)
   - `answer` Text (required)
   - `sortOrder` Integer (default: 0)

3. **Pricing** (Collection Type)
   - `name` String (required)
   - `price` Decimal
   - `period` Enumeration: `month`, `year`, `once`
   - `description` Text
   - `features` JSON
   - `isPopular` Boolean (default: false)

4. **SiteSettings** (Single Type)
   - `companyName` String
   - `unp` String
   - `email` Email
   - `phone` String
   - `address` Text
   - `botUsername` String (например `@valentinethebuhgalter_bot`)

**Добавить в `package.json` cms:**
```json
{
  "name": "apps-cms",
  "scripts": {
    "dev": "strapi develop",
    "build": "strapi build",
    "start": "strapi start"
  }
}
```

### Проверка Sprint 1

```bash
npm run migrations        # Миграция 001 применяется без ошибок
turbo build               # Все пакеты собираются
turbo dev                 # api + bot + miniapp + landing стартуют
# Открыть http://localhost:3001 — лендинг рендерится
# Открыть http://localhost:1337/admin — Strapi CMS доступна
```

---

## Sprint 2 — CMS интеграция + SEO

### Цель

Лендинг читает контент из Strapi через SSR. SEO-метатеги, sitemap, robots.

### Предусловия

- Sprint 1 завершён, Strapi запущена локально на порту 1337
- В Strapi заполнен хотя бы один тест-контент для Pricing и FAQ
- Переменная `STRAPI_API_URL=http://localhost:1337` в `.env`

### Шаг 2.1 — Интеграция Strapi API в Landing

**Создать `apps/landing/lib/strapi.ts`:**

```typescript
const STRAPI_URL = process.env.STRAPI_API_URL ?? "http://localhost:1337";

async function strapi<T>(path: string): Promise<T> {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    next: { revalidate: 60 },
    headers: { Authorization: `Bearer ${process.env.STRAPI_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Strapi error: ${res.status} ${path}`);
  const { data } = await res.json();
  return data as T;
}

export const getSiteSettings = () => strapi<SiteSettings>("/site-setting?populate=*");
export const getPricing = () => strapi<Pricing[]>("/pricings?sort=price:asc");
export const getFAQ = () => strapi<FAQ[]>("/faqs?sort=sortOrder:asc");
export const getPage = (slug: string) => strapi<Page>(`/pages?filters[slug][$eq]=${slug}`);
```

**Обновить каждую страницу — добавить async Server Component с fetch из Strapi:**
- `app/pricing/page.tsx` → `const pricing = await getPricing()`
- `app/faq/page.tsx` → `const faqs = await getFAQ()`
- `app/layout.tsx` → `const settings = await getSiteSettings()` (передать в Footer)

**Переменные окружения (добавить в `.env`):**
```
STRAPI_API_URL=http://localhost:1337
STRAPI_TOKEN=<API token из Strapi Admin Settings>
```

### Шаг 2.2 — SEO

**`apps/landing/app/sitemap.ts`:**
```typescript
import { MetadataRoute } from "next";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://valentinethebuhgalter.by";
  const staticRoutes = ["/", "/pricing", "/faq", "/contacts", "/payment", "/refund", "/privacy", "/offer"];
  return staticRoutes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
```

**`apps/landing/app/robots.ts`:**
```typescript
import { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL}/sitemap.xml`,
  };
}
```

**В `app/layout.tsx` добавить метаданные:**
```typescript
export const metadata: Metadata = {
  title: { default: "[BRAND_NAME]", template: "%s | [BRAND_NAME]" },
  description: "Учёт расходов голосом в Telegram",
  openGraph: { type: "website", locale: "ru_RU", url: "https://valentinethebuhgalter.by" },
};
```

**JSON-LD в `app/page.tsx`:**
```typescript
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "[BRAND_NAME]",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Telegram",
};
```

### Проверка Sprint 2

```bash
# Strapi запущена, токен в .env
turbo dev --filter=apps-landing
# http://localhost:3001/pricing — данные из Strapi
# http://localhost:3001/sitemap.xml — корректный sitemap
# http://localhost:3001/robots.txt — корректный robots
```

---

## Sprint 3 — Billing Module + Telegram авторизация

### Цель

Пользователь может перейти по кнопке в боте на лендинг с JWT, лендинг показывает тарифы и форму оплаты.

### Предусловия

- Sprint 1 завершён
- Миграция 001 применена к БД

### Шаг 3.1 — JWT авторизация

**Добавить в `.env`:**
```
BILLING_JWT_SECRET=<случайная строка 32+ символа>
```

**В боте — `apps/bot/src/bot/handlers/subscription.handler.ts` (создать):**
```typescript
import jwt from "jsonwebtoken";

export function generateBillingToken(telegramId: number): string {
  return jwt.sign({ telegramId }, process.env.BILLING_JWT_SECRET!, { expiresIn: "1h" });
}

// Обработчик кнопки "Купить подписку"
export async function handleSubscriptionButton(ctx: Context): Promise<void> {
  const token = generateBillingToken(ctx.from!.id);
  const url = `https://valentinethebuhgalter.by/subscribe?token=${token}`;
  await ctx.reply("Выберите тариф:", {
    reply_markup: { inline_keyboard: [[{ text: "Открыть тарифы", url }]] }
  });
}
```

**В API — новый endpoint `GET /billing/me`:**
```typescript
// Читает ?token=JWT, верифицирует, возвращает { user, subscription }
```

**На лендинге — `apps/landing/app/subscribe/page.tsx`:**
- Читает `?token` из searchParams
- Делает GET `/api/billing/me?token=...` к API
- Показывает персонализированные тарифы

### Шаг 3.2 — Billing Module в API

**Создать `apps/api/src/modules/billing/`:**

```
billing/
├── billing.module.ts
├── billing.controller.ts
├── billing.service.ts
├── subscription.service.ts
└── dto/
    ├── checkout.dto.ts
    └── change-plan.dto.ts
```

**Endpoints:**

| Method | Path | Описание |
|--------|------|----------|
| `GET` | `/billing/subscription` | Текущая подписка (auth через JWT) |
| `POST` | `/billing/checkout` | Создать сессию оплаты |
| `POST` | `/billing/cancel` | Отменить подписку |
| `POST` | `/billing/change-plan` | Сменить тариф |
| `POST` | `/billing/webhook` | Webhook от платёжной системы |

**`subscription.service.ts`** — CRUD поверх `SubscriptionRepository` (существует в `packages/server-core`).

### Проверка Sprint 3

```bash
# Бот запущен, нажать "Купить подписку"
# Ссылка открывается, JWT декодируется, страница /subscribe показывает тарифы
curl -X GET "http://localhost:3000/billing/subscription" -H "Authorization: Bearer <JWT>"
```

---

## Sprint 4 — WebPay интеграция

### Цель

Реальные платежи через WebPay BY.

### Предусловия

- Sprint 3 завершён
- Получены credentials WebPay (SHOP_ID, SECRET_KEY)

### Шаг 4.1 — WebPay Service

**Создать `apps/api/src/modules/billing/webpay/webpay.service.ts`:**

```typescript
// createCheckout(userId, plan): POST WebPay API → redirect_url
// verifyCallback(payload, signature): проверить HMAC подпись
// processSuccess(orderId): обновить подписку, сохранить recurringToken
```

**Endpoints:**

| Method | Path | Описание |
|--------|------|----------|
| `POST` | `/webpay/callback` | Callback от WebPay (статус платежа) |
| `GET` | `/webpay/success` | Редирект после успешной оплаты |
| `GET` | `/webpay/fail` | Редирект после неудачной оплаты |

**Добавить в `.env`:**
```
WEBPAY_SHOP_ID=
WEBPAY_SECRET_KEY=
WEBPAY_API_URL=https://payment.webpay.by
```

**Миграция для таблицы payments:** `002_create_payments.ts`

```typescript
// CREATE TABLE payments (
//   id SERIAL PRIMARY KEY,
//   user_id INT NOT NULL,
//   subscription_id INT,
//   amount DECIMAL(10,2),
//   currency VARCHAR(3) DEFAULT 'BYR',
//   status VARCHAR(20),
//   webpay_order_id VARCHAR,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// )
```

### Проверка Sprint 4

```bash
npm run migrations   # Миграция 002 применена
# Запустить ngrok для локального теста webhook
# POST /billing/checkout → получить redirect_url
# Открыть redirect_url → форма оплаты WebPay
# После оплаты → callback обновляет подписку
```

---

## Sprint 5 — Mini App раздел «Подписка»

### Цель

Пользователь видит свою подписку в Telegram Mini App.

### Предусловия

- Sprint 3 завершён (Billing endpoints работают)

### Шаг 5.1 — Страница подписки в apps/miniapp

**Создать `apps/miniapp/pages/subscription.vue`:**

```
Раздел: Подписка
────────────────
Тариф: Pro Month
Статус: Активна
Действует до: 04.07.2026
История платежей:
  - 04.06.2026 — 9.99 BYR ✓

[Изменить тариф] [Отменить]
```

**API calls:**
- `GET /api/billing/subscription` — данные подписки
- `GET /api/billing/payments` — история (добавить endpoint в Sprint 4)

**Авторизация:** через Telegram WebApp `initData` (уже реализована в проекте — переиспользовать).

### Проверка Sprint 5

```bash
turbo dev --filter=apps-miniapp
# Открыть Mini App в Telegram → вкладка "Подписка"
# Проверить данные, кнопки работают
```

---

## Sprint 6 — Админка платежей в CMS

### Цель

Менеджер видит пользователей, подписки, платежи в Strapi.

### Шаг 6.1 — Кастомный плагин Strapi или внешний fetch

**Вариант A (проще):** В Strapi создать Custom Routes, которые проксируют запросы к API:
```
GET /api/app-users → fetch от apps/api /admin/users
GET /api/app-subscriptions → fetch от apps/api /admin/subscriptions
```

**Вариант B:** Создать Content Types только для чтения, синхронизировать через webhook при изменении подписки.

**Рекомендуется Вариант A** — меньше дублирования данных.

**Добавить в API admin endpoints (с отдельной auth):**
```
GET /admin/users
GET /admin/subscriptions
GET /admin/payments
```

### Проверка Sprint 6

```bash
# Открыть Strapi Admin → Custom section
# Список пользователей, подписок, платежей отображается
```

---

## Итоговая структура проекта (после Sprint 1)

```
finance-platform/
├── apps/
│   ├── api/           (NestJS)
│   ├── bot/           (grammY Telegram bot)
│   ├── miniapp/       (Nuxt 3, бывший client)
│   ├── landing/       (Next.js 14)
│   └── cms/           (Strapi v5)
├── packages/
│   ├── shared-types/  (TypeScript типы, нет Node deps)
│   ├── shared-utils/  (утилиты)
│   └── server-core/   (TypeORM, services, repositories)
├── turbo.json
└── package.json
```
