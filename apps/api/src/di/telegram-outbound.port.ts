export interface TelegramOutboundPort {
  sendMessage(
    chatId: number,
    text: string,
    options?: { reply_markup?: unknown }
  ): Promise<void>;
  sendDocument(
    chatId: number,
    filename: string,
    content: string,
    caption?: string
  ): Promise<void>;
}
