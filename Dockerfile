# Multi-stage. Сборка (npm ci + turbo) идёт в CI; на сервер уезжают slim рантайм-образы.
# Ключ к малому размеру: каждый сервис получает ТОЛЬКО свои зависимости, а не общий
# жирный node_modules всей монорепы (где Strapi 674МБ + Next 400МБ тащились в каждый образ):
#   - api/bot — отдельная prod-установка только их зависимостей (без Strapi/Next);
#   - cms     — изолированная prod-установка только Strapi;
#   - landing — Next output:"standalone" (минимальный трейс модулей);
#   - miniapp — статика под nginx, node_modules не нужен вовсе.

# ---- base: исходники ----
FROM node:22-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

# ---- deps: полная установка (вкл. dev) — нужна ТОЛЬКО для сборки dist/.next ----
FROM base AS deps
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- build-base: окружение сборки (turbo + tsconfig + build-time env) ----
FROM deps AS build-base
COPY turbo.json tsconfig.json ./
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

# ---- build-<service>: компиляция (dist / .next / strapi build) ----
FROM build-base AS build-api
RUN --mount=type=cache,target=/app/.turbo npm run build:api

FROM build-base AS build-bot
RUN --mount=type=cache,target=/app/.turbo npm run build:bot

FROM build-base AS build-miniapp
RUN --mount=type=cache,target=/app/.turbo npm run build:miniapp

FROM build-base AS build-landing
RUN --mount=type=cache,target=/app/.turbo npm run build:landing

FROM build-base AS build-cms
RUN --mount=type=cache,target=/app/.turbo npm run build:cms

# ---- api-bot-deps: prod-node_modules ТОЛЬКО для api/bot (+ workspace-пакеты) ----
# Обрезаем workspaces до api+bot+packages, чтобы НЕ тянуть Strapi/Next/react.
FROM node:22-slim AS api-bot-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/bot/package.json ./apps/bot/package.json
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));p.workspaces=['packages/*','apps/api','apps/bot'];if(p.scripts)delete p.scripts.prepare;fs.writeFileSync('package.json',JSON.stringify(p));" \
 && npm install --omit=dev --no-audit --no-fund --no-package-lock

# ---- cms-deps: изолированная prod-установка только Strapi (без монорепы) ----
FROM node:22-slim AS cms-deps
WORKDIR /app/apps/cms
COPY apps/cms/package.json ./
RUN npm install --omit=dev --no-audit --no-fund --no-package-lock

# ---- bot: только свои зависимости + dist ----
FROM node:22-slim AS bot
WORKDIR /app
ENV EMBED_TELEGRAM_BOT=false
COPY --from=api-bot-deps /app/node_modules ./node_modules
COPY --from=api-bot-deps /app/package.json ./package.json
COPY --from=build-bot /app/packages ./packages
COPY --from=build-bot /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=build-bot /app/apps/bot/dist ./apps/bot/dist
WORKDIR /app/apps/bot
EXPOSE 10001
CMD ["node", "dist/main.js"]

# ---- api: + dist bot (монтирует webhook бота) + статика miniapp на /app ----
FROM node:22-slim AS api
WORKDIR /app
COPY --from=api-bot-deps /app/node_modules ./node_modules
COPY --from=api-bot-deps /app/package.json ./package.json
COPY --from=build-api /app/packages ./packages
COPY --from=build-api /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=build-api /app/apps/bot/dist ./apps/bot/dist
COPY --from=build-api /app/apps/api/package.json ./apps/api/package.json
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-miniapp /app/apps/miniapp/dist ./apps/miniapp/dist
WORKDIR /app/apps/api
EXPOSE 10000
CMD ["node", "dist/main.js"]

# ---- cms: Strapi с изолированным node_modules + рантайм-файлы приложения ----
FROM node:22-slim AS cms
ENV NODE_ENV=production
WORKDIR /app/apps/cms
COPY --from=build-cms /app/apps/cms ./
COPY --from=cms-deps /app/apps/cms/node_modules ./node_modules
EXPOSE 1337
CMD ["npm", "run", "start"]

# ---- landing: Next standalone (минимальный self-contained сервер) ----
FROM node:22-slim AS landing
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app
COPY --from=build-landing /app/apps/landing/.next/standalone ./
COPY --from=build-landing /app/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=build-landing /app/apps/landing/public ./apps/landing/public
WORKDIR /app/apps/landing
EXPOSE 3001
CMD ["node", "server.js"]

# ---- miniapp: статическая SSG-сборка Nuxt под nginx, /api проксируется на api ----
FROM nginx:alpine AS miniapp
COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-miniapp /app/apps/miniapp/dist /usr/share/nginx/html
EXPOSE 80
