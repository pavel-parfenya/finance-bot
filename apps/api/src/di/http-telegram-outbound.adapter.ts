import { config, resolveBotServiceBaseUrl } from "@finance-bot/server-core";
import type { TelegramOutboundPort } from "./telegram-outbound.port";

export class HttpTelegramOutboundAdapter implements TelegramOutboundPort {
  async sendMessage(
    chatId: number,
    text: string,
    options?: { reply_markup?: unknown }
  ): Promise<void> {
    const secret = config.internalBotSecret;
    if (!secret) {
      throw new Error(
        "INTERNAL_BOT_SECRET is required to send Telegram messages from the API service"
      );
    }
    const res = await fetch(`${resolveBotServiceBaseUrl()}/internal/telegram/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        chatId,
        text,
        replyMarkup: options?.reply_markup,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Bot service send failed: HTTP ${res.status} ${errText}`);
    }
  }
}
