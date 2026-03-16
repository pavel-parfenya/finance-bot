import "reflect-metadata";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import { createDataSource } from "./database/data-source";
import { buildContainer } from "./di/container";
import { createMiniAppApi } from "./server/mini-app-api";

const ROOT = join(process.cwd(), "..", "..");
const CLIENT_DIST = join(ROOT, "apps", "client", "dist");
const LEGACY_APP = join(ROOT, "public", "app.html");

function getAppHtml(): string {
  const indexHtml = join(CLIENT_DIST, "index.html");
  if (existsSync(indexHtml)) {
    return readFileSync(indexHtml, "utf-8");
  }
  if (existsSync(LEGACY_APP)) {
    return readFileSync(LEGACY_APP, "utf-8");
  }
  return "<!DOCTYPE html><html><body>Mini App not built. Run npm run build.</body></html>";
}

async function main(): Promise<void> {
  console.log("Подключение к базе данных...");
  const dataSource = createDataSource({
    url: config.databaseUrl,
    ssl: config.databaseSsl,
  });
  await dataSource.initialize();
  console.log("База данных подключена.");

  const container = buildContainer(config, dataSource);
  await container.bot.init();

  // Меню-кнопка отключена — выбор валюты и приложение доступны через /start
  await container.bot.api.setChatMenuButton({
    menu_button: { type: "default" },
  });

  if (config.mode === "webhook") {
    await startWebhook(container);
  } else {
    await startPolling(container);
  }
}

async function startPolling(container: ReturnType<typeof buildContainer>) {
  const { bot, userService, workspaceService, transactionRepo, invitationRepo } =
    container;
  console.log("Запуск бота в режиме polling...");
  await bot.api.deleteWebhook();

  const api = createMiniAppApi({
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    bot,
    botToken: config.telegram.botToken,
  });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
      return;
    }
    if (req.method === "GET" && req.url === "/app") {
      res.writeHead(200, { "Content-Type": "text/html" }).end(getAppHtml());
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/assets/")) {
      const assetPath = join(CLIENT_DIST, req.url.slice(1));
      if (existsSync(assetPath)) {
        const ext = assetPath.split(".").pop() ?? "";
        const ct =
          ext === "js"
            ? "application/javascript"
            : ext === "css"
              ? "text/css"
              : ext === "ico"
                ? "image/x-icon"
                : "application/octet-stream";
        res.writeHead(200, { "Content-Type": ct });
        res.end(readFileSync(assetPath));
      } else {
        res.writeHead(404).end();
      }
      return;
    }
    if (
      (req.method === "GET" || req.method === "DELETE" || req.method === "PATCH") &&
      req.url?.startsWith("/api/transactions")
    ) {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        if (
          req.method === "GET" &&
          (req.url === "/api/transactions" || req.url.startsWith("/api/transactions?"))
        ) {
          const u = new URL(req.url, "http://localhost");
          const period = u.searchParams.get("period") ?? "";
          const startDate = u.searchParams.get("startDate") ?? "";
          const endDate = u.searchParams.get("endDate") ?? "";
          const category = u.searchParams.get("category") ?? "";
          const currency = u.searchParams.get("currency") ?? "";
          const userIdParam = u.searchParams.get("userId");
          const search = u.searchParams.get("search") ?? "";
          const limitParam = u.searchParams.get("limit");
          const offsetParam = u.searchParams.get("offset");
          const userIdNum = userIdParam ? parseInt(userIdParam, 10) : 0;
          const limit = limitParam ? parseInt(limitParam, 10) : undefined;
          const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
          const filters =
            period ||
            category ||
            currency ||
            (userIdParam && !isNaN(userIdNum)) ||
            search ||
            limit !== undefined ||
            offset !== undefined
              ? {
                  period: period || undefined,
                  startDate: startDate || undefined,
                  endDate: endDate || undefined,
                  category: category || undefined,
                  currency: currency || undefined,
                  userId: userIdParam && !isNaN(userIdNum) ? userIdNum : undefined,
                  search: search || undefined,
                  limit,
                  offset,
                }
              : undefined;
          const result = await api.handleTransactions(initData, filters);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } else if (req.method === "GET" && req.url === "/api/transactions/categories") {
          const result = await api.handleTransactionsCategories(initData);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } else if (
          req.method === "GET" &&
          req.url.startsWith("/api/transactions/analytics")
        ) {
          const u = new URL(req.url, "http://localhost");
          const periodType = u.searchParams.get("period") ?? "current";
          const startDate = u.searchParams.get("startDate") ?? "";
          const endDate = u.searchParams.get("endDate") ?? "";
          const result = await api.handleAnalytics(
            initData,
            periodType,
            startDate || undefined,
            endDate || undefined
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } else if (req.method === "DELETE") {
          const match = req.url.match(/^\/api\/transactions\/(\d+)$/);
          if (match) {
            const result = await api.handleDeleteTransaction(initData, match[1]);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          } else {
            res.writeHead(404).end();
          }
        } else if (req.method === "PATCH") {
          const match = req.url.match(/^\/api\/transactions\/(\d+)$/);
          if (match) {
            const body = await readBody(req);
            const updates = JSON.parse(body) as Record<string, unknown>;
            const result = await api.handleUpdateTransaction(initData, match[1], {
              description: updates.description as string | undefined,
              category: updates.category as string | undefined,
              amount: updates.amount as number | undefined,
              currency: updates.currency as string | undefined,
              date: updates.date as string | undefined,
            });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          } else {
            res.writeHead(404).end();
          }
        } else {
          res.writeHead(404).end();
        }
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "GET" && req.url === "/api/workspace/info") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const result = await api.handleWorkspaceInfo(initData);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "POST" && req.url === "/api/workspace/invite") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const body = await readBody(req);
        const { username } = JSON.parse(body) as { username?: string };
        const result = await api.handleInvite(initData, username ?? "");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "GET" && req.url === "/api/user/settings") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const result = await api.handleGetUserSettings(initData);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "PATCH" && req.url === "/api/user/settings") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const body = await readBody(req);
        const { defaultCurrency } = JSON.parse(body) as { defaultCurrency?: string };
        const result = await api.handleSetDefaultCurrency(
          initData,
          defaultCurrency ?? ""
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    res.writeHead(404).end();
  });

  server.listen(config.port, () => {
    console.log(`HTTP-сервер на порту ${config.port} (/app, /api/transactions)`);
  });

  await bot.start({ onStart: () => console.log("Бот запущен (polling)!") });
}

async function startWebhook(container: ReturnType<typeof buildContainer>) {
  const { port, webhookPath, webhookUrl, webhookSecret } = config;
  const { bot, userService, workspaceService, transactionRepo, invitationRepo } =
    container;

  await bot.api.setWebhook(webhookUrl, {
    secret_token: webhookSecret || undefined,
  });
  console.log(`Webhook установлен: ${webhookUrl}`);

  const api = createMiniAppApi({
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    bot,
    botToken: config.telegram.botToken,
  });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
      return;
    }

    if (req.method === "GET" && req.url === "/app") {
      res.writeHead(200, { "Content-Type": "text/html" }).end(getAppHtml());
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/assets/")) {
      const assetPath = join(CLIENT_DIST, req.url.slice(1));
      if (existsSync(assetPath)) {
        const ext = assetPath.split(".").pop() ?? "";
        const ct =
          ext === "js"
            ? "application/javascript"
            : ext === "css"
              ? "text/css"
              : ext === "ico"
                ? "image/x-icon"
                : "application/octet-stream";
        res.writeHead(200, { "Content-Type": ct });
        res.end(readFileSync(assetPath));
      } else {
        res.writeHead(404).end();
      }
      return;
    }

    if (
      (req.method === "GET" || req.method === "DELETE" || req.method === "PATCH") &&
      req.url?.startsWith("/api/transactions")
    ) {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        if (
          req.method === "GET" &&
          (req.url === "/api/transactions" || req.url.startsWith("/api/transactions?"))
        ) {
          const u = new URL(req.url, "http://localhost");
          const period = u.searchParams.get("period") ?? "";
          const startDate = u.searchParams.get("startDate") ?? "";
          const endDate = u.searchParams.get("endDate") ?? "";
          const category = u.searchParams.get("category") ?? "";
          const currency = u.searchParams.get("currency") ?? "";
          const userIdParam = u.searchParams.get("userId");
          const search = u.searchParams.get("search") ?? "";
          const limitParam = u.searchParams.get("limit");
          const offsetParam = u.searchParams.get("offset");
          const userIdNum = userIdParam ? parseInt(userIdParam, 10) : 0;
          const limit = limitParam ? parseInt(limitParam, 10) : undefined;
          const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
          const filters =
            period ||
            category ||
            currency ||
            (userIdParam && !isNaN(userIdNum)) ||
            search ||
            limit !== undefined ||
            offset !== undefined
              ? {
                  period: period || undefined,
                  startDate: startDate || undefined,
                  endDate: endDate || undefined,
                  category: category || undefined,
                  currency: currency || undefined,
                  userId: userIdParam && !isNaN(userIdNum) ? userIdNum : undefined,
                  search: search || undefined,
                  limit,
                  offset,
                }
              : undefined;
          const result = await api.handleTransactions(initData, filters);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } else if (req.method === "GET" && req.url === "/api/transactions/categories") {
          const result = await api.handleTransactionsCategories(initData);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } else if (
          req.method === "GET" &&
          req.url.startsWith("/api/transactions/analytics")
        ) {
          const u = new URL(req.url, "http://localhost");
          const periodType = u.searchParams.get("period") ?? "current";
          const startDate = u.searchParams.get("startDate") ?? "";
          const endDate = u.searchParams.get("endDate") ?? "";
          const result = await api.handleAnalytics(
            initData,
            periodType,
            startDate || undefined,
            endDate || undefined
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } else if (req.method === "DELETE") {
          const match = req.url.match(/^\/api\/transactions\/(\d+)$/);
          if (match) {
            const result = await api.handleDeleteTransaction(initData, match[1]);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          } else {
            res.writeHead(404).end();
          }
        } else if (req.method === "PATCH") {
          const match = req.url.match(/^\/api\/transactions\/(\d+)$/);
          if (match) {
            const body = await readBody(req);
            const updates = JSON.parse(body) as Record<string, unknown>;
            const result = await api.handleUpdateTransaction(initData, match[1], {
              description: updates.description as string | undefined,
              category: updates.category as string | undefined,
              amount: updates.amount as number | undefined,
              currency: updates.currency as string | undefined,
              date: updates.date as string | undefined,
            });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          } else {
            res.writeHead(404).end();
          }
        } else {
          res.writeHead(404).end();
        }
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "GET" && req.url === "/api/workspace/info") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const result = await api.handleWorkspaceInfo(initData);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "POST" && req.url === "/api/workspace/invite") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const body = await readBody(req);
        const { username } = JSON.parse(body) as { username?: string };
        const result = await api.handleInvite(initData, username ?? "");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "GET" && req.url === "/api/user/settings") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const result = await api.handleGetUserSettings(initData);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "PATCH" && req.url === "/api/user/settings") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const body = await readBody(req);
        const { defaultCurrency } = JSON.parse(body) as { defaultCurrency?: string };
        const result = await api.handleSetDefaultCurrency(
          initData,
          defaultCurrency ?? ""
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }

    if (req.method === "POST" && req.url === webhookPath) {
      if (webhookSecret) {
        const token = req.headers["x-telegram-bot-api-secret-token"];
        if (token !== webhookSecret) {
          res.writeHead(403).end();
          return;
        }
      }

      try {
        const body = await readBody(req);
        const update = JSON.parse(body);
        await bot.handleUpdate(update);
        res.writeHead(200).end("OK");
      } catch (err) {
        console.error("Ошибка обработки webhook:", err);
        res.writeHead(500).end();
      }
      return;
    }

    res.writeHead(404).end();
  });

  server.listen(port, () => {
    console.log(`Бот запущен (webhook) на порту ${port}`);
  });
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

main().catch((err) => {
  console.error("Критическая ошибка:", err);
  process.exit(1);
});
