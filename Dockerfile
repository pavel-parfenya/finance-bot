# Multi-stage. Ключевой принцип: зависимости устанавливаются ОДИН раз (стадия `deps`).
# Прод-дерево получаем через `npm prune` (без повторного npm ci), рантайм-образы
# `api`/`bot` копируют готовые node_modules + dist. Это убирает параллельные npm ci,
# из-за которых на 1-CPU сервере сборка деградировала до ~1600s на каждую установку.
#
# Каждый сервис собирается СВОЕЙ командой `npm run build:<service>` в отдельной
# build-стадии (build-api/build-bot/build-cms/build-landing/build-miniapp), чтобы
# при `--target` собиралось только нужное приложение, а не все пять сразу.
# Рантайм-стадии копируют dist из соответствующей build-стадии.

# ---- base: исходники ----
# Debian-slim (glibc), а не alpine: нативные модули (better-sqlite3, sharp,
# @parcel/watcher) под glibc ставят ГОТОВЫЕ prebuilt-бинарники, поэтому node-gyp
# и тулчейн (python3/make/g++) не нужны вовсе — это убирает основную долю npm ci.
FROM node:22-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

# ---- deps: единственная полная установка (вкл. dev). Cache-mount ускоряет повторные сборки ----
FROM base AS deps

RUN --mount=type=cache,target=/root/.npm npm ci

# ---- prod-deps: прод-дерево из готового deps, без повторного npm ci ----
FROM deps AS prod-deps

RUN npm prune --omit=dev

# ---- build-base: общее окружение сборки (turbo + tsconfig + build-time env) ----
# Сами приложения здесь НЕ собираются — это делают наследники (build-<service>).
FROM deps AS build-base

# turbo build читает turbo.json в корне; пакеты наследуют корневой tsconfig.json
COPY turbo.json tsconfig.json ./

# Build-time переменные для лендинга (Next.js инлайнит STRAPI_API_URL и NEXT_PUBLIC_*
# на этапе сборки). Дефолты рассчитаны на docker-compose сеть/хост.
ARG STRAPI_API_URL=http://cms:1337
ARG NEXT_PUBLIC_API_URL=http://localhost:10000
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_BOT_USERNAME=
ARG PAYMENT_MODE=free
ENV STRAPI_API_URL=$STRAPI_API_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_BOT_USERNAME=$NEXT_PUBLIC_BOT_USERNAME \
    PAYMENT_MODE=$PAYMENT_MODE

# Сборка админки Strapi прожорлива по памяти — даём heap запас, иначе OOM (exit 137).
ENV NODE_OPTIONS=--max-old-space-size=4096

# cache-mount turbo переиспользует артефакты между сборками отдельных сервисов.

# ---- build-api: shared → server-core → bot → api ----
FROM build-base AS build-api
RUN --mount=type=cache,target=/app/.turbo npm run build:api

# ---- build-bot: shared → server-core → bot ----
FROM build-base AS build-bot
RUN --mount=type=cache,target=/app/.turbo npm run build:bot

# ---- build-miniapp: статическая SSG-сборка Nuxt ----
FROM build-base AS build-miniapp
RUN --mount=type=cache,target=/app/.turbo npm run build:miniapp

# ---- build-landing: Next.js (инлайнит STRAPI_API_URL/NEXT_PUBLIC_* из build-base) ----
FROM build-base AS build-landing
RUN --mount=type=cache,target=/app/.turbo npm run build:landing

# ---- build-cms: Strapi build ----
FROM build-base AS build-cms
RUN --mount=type=cache,target=/app/.turbo npm run build:cms

# ---- bot: наследуем готовое прод-дерево (prod-deps) + докладываем только dist ----
# FROM prod-deps (а не COPY --from=prod-deps на чистый node:22-slim): так образ
# ПЕРЕИСПОЛЬЗУЕТ уже существующий слой node_modules вместо создания нового жирного
# слоя на каждый сервис. Это кардинально сокращает «exporting layers» — главный
# тормоз сборки на слабом сервере. Симлинки workspace @finance-bot/* сохраняются.
FROM prod-deps AS bot

ENV EMBED_TELEGRAM_BOT=false

COPY --from=build-bot /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-bot /app/packages/server-core/dist ./packages/server-core/dist
COPY --from=build-bot /app/apps/bot/dist ./apps/bot/dist

WORKDIR /app/apps/bot

EXPOSE 10001

CMD ["node", "dist/main.js"]

# ---- api: тоже наследуем prod-deps, докладываем dist приложений + miniapp ----
FROM prod-deps AS api

COPY --from=build-api /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-api /app/packages/server-core/dist ./packages/server-core/dist
COPY --from=build-api /app/apps/bot/dist ./apps/bot/dist
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-miniapp /app/apps/miniapp/dist ./apps/miniapp/dist

WORKDIR /app/apps/api

EXPOSE 10000

CMD ["node", "dist/main.js"]

# ---- migrate: разовый запуск TypeORM-миграций ----
# typeorm-ts-node-commonjs гоняет миграции по исходникам — сборка не нужна,
# хватает dev-зависимостей (deps) + корневого tsconfig.json.
FROM build-base AS migrate

WORKDIR /app

CMD ["npm", "run", "migrations"]

# ---- cms: Strapi (нужны исходники + node_modules + build-артефакты целиком) ----
FROM build-cms AS cms

ENV NODE_ENV=production

WORKDIR /app/apps/cms

EXPOSE 1337

CMD ["npm", "run", "start"]

# ---- landing: Next.js (next start) ----
FROM build-landing AS landing

ENV NODE_ENV=production

WORKDIR /app/apps/landing

EXPOSE 3001

CMD ["npm", "run", "start"]

# ---- miniapp: статическая SSG-сборка Nuxt, отдаётся nginx, /api проксируется на api ----
FROM nginx:alpine AS miniapp

COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-miniapp /app/apps/miniapp/dist /usr/share/nginx/html

EXPOSE 80
