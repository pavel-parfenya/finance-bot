export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  host: env("STRAPI_HOST", "0.0.0.0"),
  port: Number(env("STRAPI_PORT", "1337")),
  app: {
    keys: env("STRAPI_APP_KEYS", "default-key-change-me").split(","),
  },
  webhooks: {
    populateRelations: env("WEBHOOKS_POPULATE_RELATIONS", "false") === "true",
  },
});
