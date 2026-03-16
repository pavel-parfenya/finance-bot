FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/client/dist ./apps/client/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/apps/server

EXPOSE 10000

CMD ["node", "dist/index.js"]
