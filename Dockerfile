# Multi-stage: для `docker build` без --target последним должен быть тот образ, который
# публикуешь на публичный URL (Mini App + API). Образ `bot` — для webhook / internal
# (отдельный сервис или `docker build --target bot`).

FROM node:22-alpine AS build

WORKDIR /app

# Тулчейн для сборки нативных модулей (better-sqlite3 в составе Strapi:
# готовых бинарников под musl/arm64 нет, node-gyp компилирует из исходников).
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci

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

RUN npm run build

FROM node:22-alpine AS bot

ENV EMBED_TELEGRAM_BOT=false

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server-core/dist ./packages/server-core/dist
COPY --from=build /app/apps/bot/dist ./apps/bot/dist

WORKDIR /app/apps/bot

EXPOSE 10001

CMD ["node", "dist/main.js"]

FROM node:22-alpine AS api

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server-core/dist ./packages/server-core/dist
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/miniapp/dist ./apps/miniapp/dist

WORKDIR /app/apps/api

EXPOSE 10000

CMD ["node", "dist/main.js"]

# ---- migrate: разовый запуск TypeORM-миграций (нужны dev-зависимости: ts-node/typeorm) ----
FROM build AS migrate

WORKDIR /app

CMD ["npm", "run", "migrations"]

# ---- cms: Strapi (нужны исходники + node_modules + build-артефакты целиком) ----
FROM build AS cms

ENV NODE_ENV=production

WORKDIR /app/apps/cms

EXPOSE 1337

CMD ["npm", "run", "start"]

# ---- landing: Next.js (next start) ----
FROM build AS landing

ENV NODE_ENV=production

WORKDIR /app/apps/landing

EXPOSE 3001

CMD ["npm", "run", "start"]

# ---- miniapp: статическая SSG-сборка Nuxt, отдаётся nginx, /api проксируется на api ----
FROM nginx:alpine AS miniapp

COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/miniapp/dist /usr/share/nginx/html

EXPOSE 80
