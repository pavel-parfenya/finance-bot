import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadEnv } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, "../../");
const env = loadEnv(process.env.NODE_ENV ?? "development", monorepoRoot, "");

const apiProxyTarget = `http://127.0.0.1:${env.PORT ?? "10000"}`;

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
    output: {
      publicDir: "dist",
    },
  },

  vite: {
    server: {
      proxy: {
        "/api": apiProxyTarget,
      },
    },
  },

  typescript: {
    strict: true,
  },
});
