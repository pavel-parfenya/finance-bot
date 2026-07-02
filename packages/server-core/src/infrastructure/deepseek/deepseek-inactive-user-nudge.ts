import OpenAI from "openai";
import { analyticsVoiceHint } from "./deepseek-analytics-voice-hints";
import { createDeepSeekClient, withDeepSeekRetry } from "./deepseek-client";

/** Напоминание в последний день месяца: зарегистрирован, но почти не ведёт учёт. */
export class DeepSeekInactiveUserNudge {
  private readonly client: OpenAI;
  /**
   * Как и EOD-напоминание, текст зависит только от voice — кэшируем по
   * (месяц, voice), т.к. nudge уходит раз в месяц: максимум один LLM-вызов
   * на voice в месяц вместо вызова на каждого неактивного юзера.
   */
  private readonly cache = new Map<string, string>();
  private cacheYm = "";

  constructor(apiKey: string) {
    this.client = createDeepSeekClient(apiKey);
  }

  async generate(voice: string): Promise<string> {
    const ym = new Date().toISOString().slice(0, 7);
    if (this.cacheYm !== ym) {
      this.cache.clear();
      this.cacheYm = ym;
    }
    const cached = this.cache.get(voice);
    if (cached) return cached;

    const voiceHint = analyticsVoiceHint(voice);
    const systemPrompt = `Ты — дружелюбный бот учёта расходов. Пользователь уже запустил бота, но почти не добавляет операции.

Напиши короткое сообщение (2–4 предложения):
• Напомни, что учёт ведётся через этого бота.
• Скажи, что можно просто написать текстом трату или отправить голосовое — бот сам разберёт.
• Без давления и длинных списков.
${voiceHint}
Только текст сообщения, без заголовков.`;

    const response = await withDeepSeekRetry(() =>
      this.client.chat.completions.create({
        model: "deepseek-chat",
        temperature: voice === "modern_18" ? 0.75 : 0.55,
        max_tokens: 250,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              "Сгенерируй напоминание на конец месяца для неактивного пользователя.",
          },
        ],
      })
    );

    const content = response.choices[0]?.message?.content?.trim();
    if (content) this.cache.set(voice, content);
    return (
      content ??
      "Ты уже в боте учёта расходов — просто напиши трату текстом или отправь голосовое, я запишу."
    );
  }
}
