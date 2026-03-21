import "reflect-metadata";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import { createDataSource } from "./database/data-source";
import { buildContainer } from "./di/container";
import { createMiniAppApi } from "./server/mini-app-api";
import { startAnalyticsCron } from "./bot/analytics-cron";

const ROOT = join(process.cwd(), "..", "..");
const CLIENT_DIST = join(ROOT, "apps", "client", "dist");
const LEGACY_APP = join(ROOT, "public", "app.html");

function getAppHtml(): string {
  for (const candidate of [
    join(CLIENT_DIST, "index.html"),
    join(CLIENT_DIST, "200.html"),
    LEGACY_APP,
  ]) {
    if (existsSync(candidate)) return readFileSync(candidate, "utf-8");
  }
  return "<!DOCTYPE html><html><body>Mini App not built. Run npm run build.</body></html>";
}

function getMimeType(ext: string): string {
  const types: Record<string, string> = {
    js: "application/javascript",
    mjs: "application/javascript",
    css: "text/css",
    ico: "image/x-icon",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    woff: "font/woff",
    woff2: "font/woff2",
    json: "application/json",
  };
  return types[ext] ?? "application/octet-stream";
}

function tryServeStatic(url: string, res: ServerResponse): boolean {
  const safePath = url.split("?")[0];
  if (safePath.includes("..")) return false;
  const filePath = join(CLIENT_DIST, safePath.slice(1));
  if (existsSync(filePath)) {
    try {
      if (statSync(filePath).isDirectory()) return false;
    } catch {
      return false;
    }
    const ext = filePath.split(".").pop() ?? "";
    res.writeHead(200, { "Content-Type": getMimeType(ext) });
    res.end(readFileSync(filePath));
    return true;
  }
  return false;
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

  startAnalyticsCron({
    analyticsInsightService: container.analyticsInsightService,
    userService: container.userService,
    workspaceService: container.workspaceService,
    bot: container.bot,
    monthlyReportGenerator: container.monthlyReportGenerator,
  });

  const miniAppUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/app` : "";
  if (miniAppUrl) {
    await container.bot.api.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "Open",
        web_app: { url: miniAppUrl },
      },
    });
  }

  if (config.mode === "webhook") {
    await startWebhook(container);
  } else {
    await startPolling(container);
  }
}

async function startPolling(container: ReturnType<typeof buildContainer>) {
  const {
    bot,
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    debtRepo,
  } = container;
  console.log("Запуск бота в режиме polling...");
  await bot.api.deleteWebhook();

  const api = createMiniAppApi({
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    debtRepo,
    bot,
    botToken: config.telegram.botToken,
  });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
      return;
    }
    if (req.method === "GET" && (req.url === "/app" || req.url?.startsWith("/app/"))) {
      res.writeHead(200, { "Content-Type": "text/html" }).end(getAppHtml());
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/assets/")) {
      if (tryServeStatic(req.url, res)) return;
      res.writeHead(404).end();
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
          const userIdParam = u.searchParams.get("userId");
          const userIdNum = userIdParam ? parseInt(userIdParam, 10) : undefined;
          const result = await api.handleAnalytics(
            initData,
            periodType,
            startDate || undefined,
            endDate || undefined,
            userIdNum && !isNaN(userIdNum) ? userIdNum : undefined
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
    if (
      req.method === "PATCH" &&
      req.url?.match(/^\/api\/workspace\/member\/\d+\/full-access$/)
    ) {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const match = req.url!.match(/^\/api\/workspace\/member\/(\d+)\/full-access$/);
        if (!match) return;
        const body = await readBody(req);
        const { fullAccess } = JSON.parse(body) as { fullAccess?: boolean };
        const targetUserId = parseInt(match[1], 10);
        const result = await api.handleSetMemberFullAccess(
          initData,
          targetUserId,
          fullAccess === true
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
        const updates = JSON.parse(body) as {
          defaultCurrency?: string | null;
          analyticsEnabled?: boolean;
          analyticsVoice?: string;
        };
        const result = await api.handleUpdateUserSettings(initData, updates);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "GET" && req.url === "/api/debts") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const result = await api.handleDebts(initData);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "POST" && req.url === "/api/debts") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const body = await readBody(req);
        const result = await api.handleCreateDebt(initData, JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "PATCH" && req.url?.startsWith("/api/debts/")) {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const id = req.url.replace("/api/debts/", "");
        const body = await readBody(req);
        const result = await api.handleUpdateDebt(initData, id, JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "DELETE" && req.url?.startsWith("/api/debts/")) {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const id = req.url.replace("/api/debts/", "");
        const result = await api.handleDeleteDebt(initData, id);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "GET" && req.url && !req.url.startsWith("/api/")) {
      if (tryServeStatic(req.url, res)) return;
      res.writeHead(200, { "Content-Type": "text/html" }).end(getAppHtml());
      return;
    }
    res.writeHead(404).end();
  });

  server.listen(config.port, () => {
    console.log(
      `HTTP-сервер на порту ${config.port} (/app, /api/transactions, /api/debts)`
    );
  });

  await bot.start({ onStart: () => console.log("Бот запущен (polling)!") });
}

async function startWebhook(container: ReturnType<typeof buildContainer>) {
  const { port, webhookPath, webhookUrl, webhookSecret } = config;
  const {
    bot,
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    debtRepo,
  } = container;

  await bot.api.setWebhook(webhookUrl, {
    secret_token: webhookSecret || undefined,
  });
  console.log(`Webhook установлен: ${webhookUrl}`);

  const api = createMiniAppApi({
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    debtRepo,
    bot,
    botToken: config.telegram.botToken,
  });

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
      return;
    }

    if (req.method === "GET" && (req.url === "/app" || req.url?.startsWith("/app/"))) {
      res.writeHead(200, { "Content-Type": "text/html" }).end(getAppHtml());
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/assets/")) {
      if (tryServeStatic(req.url, res)) return;
      res.writeHead(404).end();
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
          const userIdParam = u.searchParams.get("userId");
          const userIdNum = userIdParam ? parseInt(userIdParam, 10) : undefined;
          const result = await api.handleAnalytics(
            initData,
            periodType,
            startDate || undefined,
            endDate || undefined,
            userIdNum && !isNaN(userIdNum) ? userIdNum : undefined
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
    if (
      req.method === "PATCH" &&
      req.url?.match(/^\/api\/workspace\/member\/\d+\/full-access$/)
    ) {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const match = req.url!.match(/^\/api\/workspace\/member\/(\d+)\/full-access$/);
        if (!match) return;
        const body = await readBody(req);
        const { fullAccess } = JSON.parse(body) as { fullAccess?: boolean };
        const targetUserId = parseInt(match[1], 10);
        const result = await api.handleSetMemberFullAccess(
          initData,
          targetUserId,
          fullAccess === true
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
        const updates = JSON.parse(body) as {
          defaultCurrency?: string | null;
          analyticsEnabled?: boolean;
          analyticsVoice?: string;
        };
        const result = await api.handleUpdateUserSettings(initData, updates);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "GET" && req.url === "/api/debts") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const result = await api.handleDebts(initData);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "POST" && req.url === "/api/debts") {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const body = await readBody(req);
        const result = await api.handleCreateDebt(initData, JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "PATCH" && req.url?.startsWith("/api/debts/")) {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const id = req.url.replace("/api/debts/", "");
        const body = await readBody(req);
        const result = await api.handleUpdateDebt(initData, id, JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("API error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Внутренняя ошибка сервера" }));
      }
      return;
    }
    if (req.method === "DELETE" && req.url?.startsWith("/api/debts/")) {
      const initData =
        (req.headers["x-telegram-init-data"] as string) ??
        (req.headers["x-init-data"] as string) ??
        "";
      try {
        const id = req.url.replace("/api/debts/", "");
        const result = await api.handleDeleteDebt(initData, id);
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

    if (req.method === "GET" && req.url && !req.url.startsWith("/api/")) {
      if (tryServeStatic(req.url, res)) return;
      res.writeHead(200, { "Content-Type": "text/html" }).end(getAppHtml());
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
