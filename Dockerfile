# Multi-stage: для `docker build` без --target последним должен быть тот образ, который
# публикуешь на публичный URL (Mini App + API). Образ `bot` — для webhook / internal
# (отдельный сервис или `docker build --target bot`).

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci
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
COPY --from=build /app/apps/client/dist ./apps/client/dist

WORKDIR /app/apps/api

EXPOSE 10000

CMD ["node", "dist/main.js"]
