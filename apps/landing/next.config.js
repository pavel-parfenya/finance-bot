const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const strapiUrl = process.env.STRAPI_API_URL || "http://localhost:1337";
const strapi = new URL(strapiUrl);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone: Next трейсит реально используемые модули и кладёт минимальный их
  // набор в .next/standalone — на рантайме не нужен полный node_modules (~400МБ Next).
  output: "standalone",
  // монорепа: корень трассировки — корень репозитория, иначе трейс неполный.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  env: {
    STRAPI_API_URL: process.env.STRAPI_API_URL,
    NEXT_PUBLIC_BOT_USERNAME: process.env.NEXT_PUBLIC_BOT_USERNAME,
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.PUBLIC_BASE_URL ||
      "http://localhost:10000",
  },
  images: {
    remotePatterns: [
      {
        protocol: strapi.protocol.replace(":", ""),
        hostname: strapi.hostname,
        port: strapi.port || "",
        pathname: "/uploads/**",
      },
    ],
  },
};

module.exports = nextConfig;
