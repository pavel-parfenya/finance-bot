# Finance Bot

Telegram-бот для учёта финансов с распознаванием голосовых сообщений. Монорепо на npm workspaces + Turborepo.

## Структура

```
apps/
  api/        NestJS HTTP API + Telegram webhook
  bot/        Telegram bot process (grammY)
  miniapp/    Nuxt 3 Telegram Mini App
  landing/    Next.js 14 публичный лендинг
  cms/        Strapi v5 CMS
packages/
  shared/       типы и утилиты (нет Node deps)
  server-core/  весь backend-домен: сервисы, репозитории, TypeORM
```

## Технологии

- **Bot:** grammY, DeepSeek (LLM парсинг), Groq Whisper (распознавание голоса)
- **API:** NestJS, TypeORM, PostgreSQL
- **Mini App:** Nuxt 3
- **Landing:** Next.js 14, Tailwind CSS
- **CMS:** Strapi v5

## Команды

```bash
npm run dev          # все приложения (Turborepo)
npm run dev:api      # только API
npm run dev:bot      # только бот
npm run dev:client   # только Mini App

npm run build        # сборка всех пакетов
npm test             # vitest
npm run lint
npm run migrations   # TypeORM миграции
```

## Переменные окружения

Один `.env` в корне:

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |
| `DEEPSEEK_API_KEY` | LLM для парсинга сообщений |
| `WHISPER_API_KEY` | STT (Groq или OpenAI) |
| `WHISPER_BASE_URL` | STT endpoint |
| `STRAPI_API_URL` | URL Strapi CMS |
| `STRAPI_TOKEN` | API-токен Strapi |
| `NEXT_PUBLIC_BASE_URL` | Базовый URL лендинга |
| `MODE` | `polling` или `webhook` |
| `EMBED_TELEGRAM_BOT` | `true` — бот внутри API-процесса |

## Режимы деплоя

- **Single process (Render):** `MODE=webhook`, `EMBED_TELEGRAM_BOT=true` — бот запускается внутри API.
- **Dual process:** API и Bot запускаются отдельно, `EMBED_TELEGRAM_BOT=false`.
