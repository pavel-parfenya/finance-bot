export default [
  "strapi::logger",
  "strapi::errors",
  "strapi::security",
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  { name: "strapi::favicon", config: { path: "./public/favicon.ico" } },
  "strapi::public",
];
