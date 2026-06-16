import type { Core } from "@strapi/strapi";
import * as dotenv from "dotenv";
import * as path from "path";

// Load shared root .env (../../.env from apps/cms/)
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), override: false });

// Публичные (роль Public) права на чтение типов, которые читает лендинг.
// Без них API отдаёт 403 и лендинг получает пусто. Single types — только find,
// collection types — find + findOne.
const PUBLIC_FIND_ACTIONS = [
  "api::site-setting.site-setting.find",
  "api::home-page.home-page.find",
  "api::pricing.pricing.find",
  "api::pricing.pricing.findOne",
  "api::faq.faq.find",
  "api::faq.faq.findOne",
  "api::page.page.find",
  "api::page.page.findOne",
  "api::feature.feature.find",
  "api::feature.feature.findOne",
];

export default {
  register({ strapi: _strapi }: { strapi: Core.Strapi }) {},

  // Идемпотентно выдаём public-роли права на чтение контента лендинга при старте.
  // Нужно, чтобы свежий деплой / пересозданный volume не терял права (иначе 403).
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      const publicRole = await strapi
        .query("plugin::users-permissions.role")
        .findOne({ where: { type: "public" } });
      if (!publicRole) return;

      for (const action of PUBLIC_FIND_ACTIONS) {
        const existing = await strapi
          .query("plugin::users-permissions.permission")
          .findOne({ where: { action, role: publicRole.id } });
        if (!existing) {
          await strapi
            .query("plugin::users-permissions.permission")
            .create({ data: { action, role: publicRole.id } });
        }
      }
    } catch (err) {
      strapi.log.error(`Не удалось выставить публичные права: ${err}`);
    }
  },
};
