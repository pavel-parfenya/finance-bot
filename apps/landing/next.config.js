const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const strapiUrl = process.env.STRAPI_API_URL || "http://localhost:1337";
const strapi = new URL(strapiUrl);

/** @type {import('next').NextConfig} */
const nextConfig = {
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
