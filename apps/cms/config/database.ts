import path from "path";

function parseConnectionUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 5432,
    database: u.pathname.replace(/^\//, ""),
    user: u.username,
    password: u.password,
  };
}

export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => {
  const client = env("STRAPI_DATABASE_CLIENT", "sqlite");

  if (client === "postgres") {
    const schema = env("STRAPI_DATABASE_SCHEMA", "strapi");
    const databaseUrl = env("DATABASE_URL", "");

    const conn = databaseUrl
      ? parseConnectionUrl(databaseUrl)
      : {
          host: env("STRAPI_DATABASE_HOST", "127.0.0.1"),
          port: Number(env("STRAPI_DATABASE_PORT", "5432")),
          database: env("STRAPI_DATABASE_NAME", "finance_bot"),
          user: env("STRAPI_DATABASE_USERNAME", "strapi"),
          password: env("STRAPI_DATABASE_PASSWORD", "strapi"),
        };

    const ssl =
      env("STRAPI_DATABASE_SSL", env("DATABASE_SSL", "false")) === "true"
        ? { rejectUnauthorized: false }
        : false;

    return {
      connection: {
        client: "postgres",
        connection: {
          ...conn,
          ssl,
          // Strapi определяет рабочую схему через connection.schema (getSchemaName),
          // а НЕ через searchPath. Без этого инспектор схемы читает из "public" (пусто)
          // и при любом изменении content-type генерирует CREATE TABLE вместо ALTER.
          schema,
        },
        searchPath: [schema, "public"],
        acquireConnectionTimeout: 60000,
        debug: false,
      },
    };
  }

  return {
    connection: {
      client: "sqlite",
      connection: {
        filename: path.join(__dirname, "..", ".tmp", "data.db"),
      },
      useNullAsDefault: true,
    },
  };
};
