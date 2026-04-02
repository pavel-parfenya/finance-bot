import OpenAI from "openai";
import type { MonthlyReportData } from "./deepseek-monthly-report";
import { analyticsVoiceHint } from "./deepseek-analytics-voice-hints";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export interface WeeklyForecastMeta {
  /** Сколько календарных дней осталось до конца месяца включая сегодня (по локали пользователя). */
  daysLeftInMonth: number;
  daysPassedInMonth: number;
  daysInMonth: number;
}

export class DeepSeekWeeklyForecast {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async generate(
    data: MonthlyReportData,
    voice: string,
    meta: WeeklyForecastMeta
  ): Promise<string> {
    const voiceHint = analyticsVoiceHint(voice);
    const currentTop = data.currentExpenseByCategory
      .slice(0, 8)
      .map((c) => `  • ${c.category}: ${c.amount} ${data.defaultCurrency}`)
      .join("\n");

    const deltaPercent =
      data.totalExpensePrev > 0
        ? (
            ((data.totalExpenseCurrent - data.totalExpensePrev) / data.totalExpensePrev) *
            100
          ).toFixed(1)
        : "—";

    const netLine =
      data.hasIncomeCurrent && data.projectedNetEom !== null
        ? `• Учтённый доход с начала месяца: ${data.totalIncomeCurrent.toFixed(0)} ${data.defaultCurrency}
• Ориентировочный остаток к концу месяца (доход минус прогноз расходов): ~${data.projectedNetEom.toFixed(0)} ${data.defaultCurrency}`
        : `• Доходы в учёте не указаны — говори только про расходы, не придумывай доход`;

    const systemPrompt = `Ты — финансовый советник. Краткий еженедельный снимок (месяц ещё не закончен).

ВАЖНО: горизонт — только до конца ТЕКУЩЕГО месяца. Никаких прогнозов на год. В топе категорий только РАСХОДЫ.

Факты:
• Уже потрачено с начала месяца: ${data.totalExpenseCurrent.toFixed(0)} ${data.defaultCurrency}
• Расходы за тот же период прошлого месяца: ${data.totalExpensePrev.toFixed(0)} ${data.defaultCurrency} (изменение расходов ≈ ${deltaPercent}%)
• Прогноз РАСХОДОВ до конца этого месяца: ~${data.projectedExpenseEom.toFixed(0)} ${data.defaultCurrency}
${netLine}
• Дней в месяце: ${meta.daysInMonth}, прошло: ${meta.daysPassedInMonth}, до конца включая сегодня: ${meta.daysLeftInMonth}

Топ категорий расходов:
${currentTop || "  (нет расходов)"}

Ответ: 2 коротких абзаца или 3–5 предложений одним блоком:
1) сколько уже потрачено и куда уходит больше всего (только расходы);
2) где можно сэкономить — по категориям из топа;
3) прогноз до конца ЭТОГО месяца (расходы; при наличии дохода — можно упомянуть остаток).
${voiceHint}
Без таблиц и маркированных простыней.`;

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: voice === "modern_18" ? 0.75 : 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Дай короткий прогноз до конца текущего месяца и идеи по экономии. Не считай на год.",
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content ?? "Не удалось сформировать прогноз.";
  }
}
