import OpenAI from "openai";
import { analyticsVoiceHint } from "./deepseek-analytics-voice-hints";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

/** Напоминание в последний день месяца: зарегистрирован, но почти не ведёт учёт. */
export class DeepSeekInactiveUserNudge {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async generate(voice: string): Promise<string> {
    const voiceHint = analyticsVoiceHint(voice);
    const systemPrompt = `Ты — дружелюбный бот учёта расходов. Пользователь уже запустил бота, но почти не добавляет операции.

Напиши короткое сообщение (2–4 предложения):
• Напомни, что учёт ведётся через этого бота.
• Скажи, что можно просто написать текстом трату или отправить голосовое — бот сам разберёт.
• Без давления и длинных списков.
${voiceHint}
Только текст сообщения, без заголовков.`;

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: voice === "modern_18" ? 0.75 : 0.55,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Сгенерируй напоминание на конец месяца для неактивного пользователя.",
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    return (
      content ??
      "Ты уже в боте учёта расходов — просто напиши трату текстом или отправь голосовое, я запишу."
    );
  }
}
