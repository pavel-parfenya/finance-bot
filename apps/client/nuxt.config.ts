import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import fs from "node:fs";
import { config as loadDotenv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, "../../");
const mode = process.env.NODE_ENV ?? "development";

const envFiles = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];

for (const file of envFiles) {
  const fullPath = resolve(monorepoRoot, file);
  if (fs.existsSync(fullPath)) {
    loadDotenv({ path: fullPath, override: true });
  }
}

const apiBackendPort = process.env.PORT ?? "10000";
const apiProxyTarget = `http://127.0.0.1:${apiBackendPort}`;

export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: false },

  app: {
    buildAssetsDir: "/assets/",
    head: {
      htmlAttrs: { lang: "ru" },
      meta: [
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
        },
      ],
      title: "Мои расходы",
      script: [{ src: "https://telegram.org/js/telegram-web-app.js" }],
    },
  },

  css: ["~/assets/css/main.css"],

  nitro: {
    compatibilityDate: "2026-03-30",
    output: {
      publicDir: "dist",
    },
  },

  vite: {
    server: {
      // Прокси на Nest API. Нужен запущенный backend: `npm run dev` (корень) или `npm run dev:server`.
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  },

  typescript: {
    strict: true,
  },
});
