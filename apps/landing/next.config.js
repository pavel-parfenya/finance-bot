const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

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
};

module.exports = nextConfig;
