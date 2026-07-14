import { config, resolveBotServiceBaseUrl } from "../../config";

/**
 * Отправка сообщения в Telegram через internal-endpoint сервиса бота
 * (POST /internal/telegram/send). Тот же канал, что и HttpTelegramOutboundAdapter
 * в apps/api, но доступный изнутри server-core (см. AdminNotifyService).
 */
export async function sendTelegramViaInternalBot(
  chatId: number,
  text: string
): Promise<void> {
  const secret = config.internalBotSecret;
  if (!secret) {
    throw new Error("INTERNAL_BOT_SECRET is required to send Telegram messages");
  }
  const res = await fetch(`${resolveBotServiceBaseUrl()}/internal/telegram/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ chatId, text }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Bot service send failed: HTTP ${res.status} ${errText}`);
  }
}
