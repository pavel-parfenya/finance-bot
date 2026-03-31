export interface TelegramOutboundPort {
  sendMessage(
    chatId: number,
    text: string,
    options?: { reply_markup?: unknown }
  ): Promise<void>;
}
