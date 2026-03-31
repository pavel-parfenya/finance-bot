import OpenAI from "openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const VOICE_INSTRUCTIONS: Record<string, string> = {
  official: "Пиши нейтрально, деловым тоном.",
  strict: "Пиши назидательно, серьёзно.",
  modern: "Используй сленг, «короче», «ну типа», «бабло».",
  modern_18: "Сленг + можно мат (мягко).",
};

export interface MonthlyReportData {
  currentByCategory: Array<{ category: string; amount: string }>;
  prevByCategory: Array<{ category: string; amount: string }>;
  totalCurrent: number;
  totalPrev: number;
  forecast: number;
  defaultCurrency: string;
}

export class DeepSeekMonthlyReport {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async generateReport(data: MonthlyReportData, voice: string): Promise<string> {
    const voiceHint = VOICE_INSTRUCTIONS[voice] ?? VOICE_INSTRUCTIONS.official;

    const currentTop = data.currentByCategory
      .slice(0, 8)
      .map((c) => `  • ${c.category}: ${c.amount} ${data.defaultCurrency}`)
      .join("\n");

    const deltaPercent =
      data.totalPrev > 0
        ? (((data.totalCurrent - data.totalPrev) / data.totalPrev) * 100).toFixed(1)
        : "—";

    const systemPrompt = `Ты — финансовый советник. Краткий отчёт на конец месяца.

Данные:
Текущий месяц: ${data.totalCurrent.toFixed(0)} ${data.defaultCurrency}
Прошлый: ${data.totalPrev.toFixed(0)} ${data.defaultCurrency} (${deltaPercent}%)
Прогноз: ~${data.forecast.toFixed(0)} ${data.defaultCurrency}

Топ категорий:
${currentTop}

Ответ: 1-2 коротких абзаца. Включи: сравнение с прошлым месяцем, топ-2 категории, один совет по экономии.
${voiceHint}
Кратко, без воды.`;

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Сформируй месячный отчёт по тратам.",
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content ?? "Не удалось сформировать отчёт.";
  }
}
