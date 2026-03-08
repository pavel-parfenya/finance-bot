import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { config } from "./config";
import { buildContainer } from "./di/container";

async function main(): Promise<void> {
  const { bot } = buildContainer(config);
  await bot.init();

  if (config.mode === "webhook") {
    await startWebhook(bot);
  } else {
    await startPolling(bot);
  }
}

async function startPolling(bot: ReturnType<typeof buildContainer>["bot"]) {
  console.log("Запуск бота в режиме polling...");
  await bot.api.deleteWebhook();
  await bot.start({ onStart: () => console.log("Бот запущен (polling)!") });
}

async function startWebhook(bot: ReturnType<typeof buildContainer>["bot"]) {
  const { port, webhookPath, webhookUrl, webhookSecret } = config;

  await bot.api.setWebhook(webhookUrl, {
    secret_token: webhookSecret || undefined,
  });
  console.log(`Webhook установлен: ${webhookUrl}`);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
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
