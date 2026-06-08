export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
  "users-permissions": {
    config: {
      jwtSecret: env("STRAPI_JWT_SECRET", "change-me-in-production"),
    },
  },
});
