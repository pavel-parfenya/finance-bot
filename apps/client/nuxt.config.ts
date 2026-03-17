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
        "/api": "http://localhost:3000",
      },
    },
  },

  typescript: {
    strict: true,
  },

  compatibilityDate: "2026-03-17",
});
