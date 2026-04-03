import { config, resolveBotServiceBaseUrl } from "@finance-bot/server-core";
import type { TelegramOutboundPort } from "./telegram-outbound.port";

/** Grammy `InlineKeyboard` и плоский объект Telegram API сериализуются одинаково. */
function wireReplyMarkup(markup: unknown): unknown {
  if (markup && typeof markup === "object" && "inline_keyboard" in (markup as object)) {
    const m = markup as { inline_keyboard: unknown };
    return { inline_keyboard: m.inline_keyboard };
  }
  return markup;
}

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
    const payload: Record<string, unknown> = { chatId, text };
    if (options?.reply_markup != null) {
      payload.replyMarkup = wireReplyMarkup(options.reply_markup);
    }
    const res = await fetch(`${resolveBotServiceBaseUrl()}/internal/telegram/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Bot service send failed: HTTP ${res.status} ${errText}`);
    }
  }
}
