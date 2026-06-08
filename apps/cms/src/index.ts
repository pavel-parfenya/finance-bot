import type { Core } from "@strapi/strapi";
import * as dotenv from "dotenv";
import * as path from "path";

// Load shared root .env (../../.env from apps/cms/)
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), override: false });

export default {
  register({ strapi: _strapi }: { strapi: Core.Strapi }) {},
  bootstrap({ strapi: _strapi }: { strapi: Core.Strapi }) {},
};
