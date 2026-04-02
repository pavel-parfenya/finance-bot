import OpenAI from "openai";
import { analyticsVoiceHint } from "./deepseek-analytics-voice-hints";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export class DeepSeekEndOfDayReminder {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async generate(voice: string): Promise<string> {
    const voiceHint = analyticsVoiceHint(voice);
    const systemPrompt = `Ты — бот учёта расходов. У пользователя уже есть траты в базе, но за последние сутки он ничего не занёс.
Напомни коротко (1–3 предложения) внести сегодняшние траты в приложение. Без нравоучений и длинных списков.
${voiceHint}`;

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: voice === "modern_18" ? 0.75 : 0.55,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Сформулируй напоминание на вечер." },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content ?? "Не забудь занести сегодняшние траты в приложение.";
  }
}
