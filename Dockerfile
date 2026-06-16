# Multi-stage. Сборка (npm ci + turbo) идёт в CI на GH-раннерах; на сервер уезжают
# только slim рантайм-образы. Ключ к малому размеру: финальные стадии берут чистый
# node:22-slim и КОПИРУЮТ туда лишь production-node_modules (стадия `prune`) + dist.
# Так dev-зависимости всей монорепы (turbo/tsc/nuxt/next-build/strapi-build/eslint…)
# физически НЕ попадают в образы — а раньше «жирный» dev-слой тащился в каждый.

# ---- base: исходники ----
# Debian-slim (glibc): нативные модули (better-sqlite3, sharp) ставят prebuilt-бинарники,
# поэтому node-gyp/тулчейн не нужны.
FROM node:22-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

# ---- deps: единственная полная установка (вкл. dev) для сборки. Cache-mount ускоряет ----
FROM base AS deps

RUN --mount=type=cache,target=/root/.npm npm ci

# ---- prune: прод-дерево node_modules (без dev). Копируется в рантайм одним свежим слоём ----
FROM deps AS prune

RUN npm prune --omit=dev

# ---- build-base: общее окружение сборки (turbo + tsconfig + build-time env) ----
FROM deps AS build-base

COPY turbo.json tsconfig.json ./

# Build-time переменные для лендинга (Next.js) и miniapp (Nuxt) — инлайнятся при сборке.
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

# ---- build-<service>: каждый собирается своей командой (cache-mount turbo) ----
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

# ---- runtime-base: чистый slim + ТОЛЬКО прод-node_modules (общий слой для api/bot/cms/landing) ----
# COPY готового прод-дерева из `prune` создаёт один свежий слой без dev-истории.
FROM node:22-slim AS runtime-base
WORKDIR /app
COPY --from=prune /app/node_modules ./node_modules
COPY --from=prune /app/package.json ./package.json
COPY --from=prune /app/package-lock.json ./package-lock.json

# ---- bot: server-core + shared(+types/utils) dist + bot dist ----
FROM runtime-base AS bot
ENV EMBED_TELEGRAM_BOT=false
COPY --from=build-bot /app/packages ./packages
COPY --from=build-bot /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=build-bot /app/apps/bot/dist ./apps/bot/dist
WORKDIR /app/apps/bot
EXPOSE 10001
CMD ["node", "dist/main.js"]

# ---- api: + dist bot (api монтирует webhook бота) + статика miniapp на /app ----
FROM runtime-base AS api
COPY --from=build-api /app/packages ./packages
COPY --from=build-api /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=build-api /app/apps/bot/dist ./apps/bot/dist
COPY --from=build-api /app/apps/api/package.json ./apps/api/package.json
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-miniapp /app/apps/miniapp/dist ./apps/miniapp/dist
WORKDIR /app/apps/api
EXPOSE 10000
CMD ["node", "dist/main.js"]

# ---- cms: Strapi. Прод-node_modules (@strapi/* — prod) + все рантайм-файлы приложения ----
FROM runtime-base AS cms
ENV NODE_ENV=production
COPY --from=build-cms /app/apps/cms ./apps/cms
WORKDIR /app/apps/cms
EXPOSE 1337
CMD ["npm", "run", "start"]

# ---- landing: Next.js (next — prod-зависимость). .next + public + конфиг ----
FROM runtime-base AS landing
ENV NODE_ENV=production
COPY --from=build-landing /app/apps/landing/.next ./apps/landing/.next
COPY --from=build-landing /app/apps/landing/public ./apps/landing/public
COPY --from=build-landing /app/apps/landing/next.config.js ./apps/landing/next.config.js
COPY --from=build-landing /app/apps/landing/package.json ./apps/landing/package.json
WORKDIR /app/apps/landing
EXPOSE 3001
CMD ["npm", "run", "start"]

# ---- miniapp: статическая SSG-сборка Nuxt, отдаётся nginx, /api проксируется на api ----
FROM nginx:alpine AS miniapp
COPY apps/miniapp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-miniapp /app/apps/miniapp/dist /usr/share/nginx/html
EXPOSE 80
