import type { Application } from "express";
import type { Bot } from "grammy";
import { config } from "@finance-bot/server-core";

/**
 * API → бот: исходящие сообщения (в т.ч. кнопки подтверждения долга).
 * Должен быть доступен и при `MODE=polling` (отдельный контейнер бота), и при webhook.
 */
export function attachInternalTelegramSendRoute(app: Application, bot: Bot): void {
  app.post("/internal/telegram/send", async (req, res) => {
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
}

/** Webhook Telegram (только MODE=webhook). */
function attachWebhookRoute(app: Application, bot: Bot): void {
  const { webhookPath, webhookSecret } = config;
  app.post(webhookPath, async (req, res) => {
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

/** POST /webhook (если webhook) и POST /internal/telegram/send на том же Express, что и Nest (один URL в проде). */
export function attachTelegramBotHttpRoutes(app: Application, bot: Bot): void {
  attachInternalTelegramSendRoute(app, bot);
  if (config.mode !== "webhook") return;
  attachWebhookRoute(app, bot);
}
