export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  auth: {
    secret: env("STRAPI_ADMIN_JWT_SECRET", "change-me-in-production"),
  },
  apiToken: {
    salt: env("STRAPI_API_TOKEN_SALT", "change-me-in-production"),
  },
  transfer: {
    token: {
      salt: env("STRAPI_TRANSFER_TOKEN_SALT", "change-me-in-production"),
    },
  },
  secrets: {
    encryptionKey: env("STRAPI_ENCRYPTION_KEY", "change-me-in-production"),
  },
  flags: {
    nps: false,
    promoteEE: false,
  },
});
