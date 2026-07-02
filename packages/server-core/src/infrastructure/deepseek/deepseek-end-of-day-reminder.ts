import OpenAI from "openai";
import { analyticsVoiceHint } from "./deepseek-analytics-voice-hints";
import {
  createDeepSeekClient,
  DEEPSEEK_MODEL,
  withDeepSeekRetry,
} from "./deepseek-client";

export class DeepSeekEndOfDayReminder {
  private readonly client: OpenAI;
  /**
   * Текст зависит только от voice и не содержит данных пользователя, а крон
   * зовёт generate() для каждого юзера ежедневно. Кэшируем по (день, voice):
   * максимум по одному LLM-вызову на voice в сутки вместо вызова на юзера;
   * разнообразие день ото дня сохраняется.
   */
  private readonly cache = new Map<string, string>();
  private cacheDay = "";

  constructor(apiKey: string) {
    this.client = createDeepSeekClient(apiKey);
  }

  async generate(voice: string): Promise<string> {
    const day = new Date().toISOString().slice(0, 10);
    if (this.cacheDay !== day) {
      this.cache.clear();
      this.cacheDay = day;
    }
    const cached = this.cache.get(voice);
    if (cached) return cached;

    const voiceHint = analyticsVoiceHint(voice);
    const systemPrompt = `Ты — бот учёта расходов. У пользователя уже есть траты в базе, но за последние сутки он ничего не занёс.
Напомни коротко (1–3 предложения) внести сегодняшние траты в приложение. Без нравоучений и длинных списков.
${voiceHint}`;

    const response = await withDeepSeekRetry(() =>
      this.client.chat.completions.create({
        model: DEEPSEEK_MODEL,
        temperature: voice === "modern_18" ? 0.75 : 0.55,
        max_tokens: 200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Сформулируй напоминание на вечер." },
        ],
      })
    );

    const content = response.choices[0]?.message?.content?.trim();
    if (content) this.cache.set(voice, content);
    return content ?? "Не забудь занести сегодняшние траты в приложение.";
  }
}
