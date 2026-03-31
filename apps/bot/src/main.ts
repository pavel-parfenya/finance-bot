import express from "express";
import { config, initDatabase, createCoreServices } from "@finance-bot/server-core";
import { createBot } from "./bot/bot";
import { configureBotAfterInit } from "./bootstrap-bot";

async function bootstrap(): Promise<void> {
  const dataSource = await initDatabase();
  const core = createCoreServices(config, dataSource);

  const miniAppUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/app` : "";
  console.log(
    `Mini App URL (меню Telegram и /app): ${miniAppUrl || "не задан — укажите PUBLIC_BASE_URL или RENDER_EXTERNAL_URL"}`
  );
  const bot = createBot(config.telegram.botToken, {
    ...core,
    miniAppUrl,
    superAdminUsername: config.superAdminUsername,
  });

  await bot.init();
  await configureBotAfterInit(bot, core);

  const httpApp = express();
  httpApp.use(express.json({ limit: "10mb" }));

  httpApp.get("/health", (_req, res) => {
    res.type("text/plain").send("OK");
  });

  if (config.mode === "webhook") {
    const { webhookPath, webhookSecret } = config;
    httpApp.post(webhookPath, async (req, res) => {
      if (webhookSecret) {
        const token = req.headers["x-telegram-bot-api-secret-token"];
        if (token !== webhookSecret) {
          res.status(403).end();
          return;
        }
      }
      try {
        await bot.handleUpdate(req.body);
        res.status(200).send("OK");
      } catch (err) {
        console.error("Ошибка обработки webhook:", err);
        res.status(500).end();
      }
    });
  }

  httpApp.post("/internal/telegram/send", async (req, res) => {
    const secret = config.internalBotSecret;
    if (!secret) {
      res.status(503).json({ error: "INTERNAL_BOT_SECRET is not set" });
      return;
    }
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      res.status(401).end();
      return;
    }
    const body = req.body as {
      chatId?: number;
      text?: string;
      replyMarkup?: unknown;
    };
    if (typeof body.chatId !== "number" || typeof body.text !== "string") {
      res.status(400).json({ error: "Expected chatId (number) and text (string)" });
      return;
    }
    try {
      await bot.api.sendMessage(body.chatId, body.text, {
        ...(body.replyMarkup != null ? { reply_markup: body.replyMarkup as never } : {}),
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("internal/telegram/send:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "sendMessage failed",
      });
    }
  });

  await new Promise<void>((resolve) => {
    httpApp.listen(config.botHttpPort, () => {
      console.log(
        `Bot HTTP на порту ${config.botHttpPort} (health, internal send${
          config.mode === "webhook" ? ", webhook" : ""
        })`
      );
      resolve();
    });
  });

  if (config.mode === "polling") {
    await bot.start({ onStart: () => console.log("Бот запущен (polling)!") });
  } else {
    console.log(`Бот в режиме webhook, слушает ${config.webhookPath}`);
  }
}

bootstrap().catch((err) => {
  console.error("Критическая ошибка (bot):", err);
  process.exit(1);
});
