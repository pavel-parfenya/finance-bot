import OpenAI from "openai";
import { analyticsVoiceHint } from "./deepseek-analytics-voice-hints";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export interface MonthlyReportData {
  defaultCurrency: string;
  /** Топ только по расходам. */
  currentExpenseByCategory: Array<{ category: string; amount: string }>;
  prevExpenseByCategory: Array<{ category: string; amount: string }>;
  totalExpenseCurrent: number;
  totalExpensePrev: number;
  /** Сумма записанных доходов за месяц. */
  totalIncomeCurrent: number;
  totalIncomePrev: number;
  hasIncomeCurrent: boolean;
  /** Линейный прогноз расходов на конец текущего месяца. */
  projectedExpenseEom: number;
  /** Учтённый доход минус прогноз расходов до конца месяца; null если доходов нет. */
  projectedNetEom: number | null;
  daysPassed: number;
  daysInMonth: number;
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

    const netBlock =
      data.hasIncomeCurrent && data.projectedNetEom !== null
        ? `Учтённый доход за месяц: ${data.totalIncomeCurrent.toFixed(0)} ${data.defaultCurrency}
Ориентировочный остаток к концу месяца (доход минус прогноз расходов): ~${data.projectedNetEom.toFixed(0)} ${data.defaultCurrency}
(Доход — сумма занесённых записей дохода; если занесён не весь — цифра приблизительная.)`
        : `Доходы в учёте не указаны — делай выводы только по расходам, не выдумывай доход.`;

    const systemPrompt = `Ты — финансовый советник. Итоговый отчёт за текущий месяц (сообщение на конец месяца).

ВАЖНО:
• Все суммы ниже — только до конца ТЕКУЩЕГО календарного месяца. Запрещено считать или упоминать прогноз на год.
• В блоке «Топ категорий» только РАСХОДЫ. Не называй доходы «тратами» и не смешивай их с расходами.
• Топ-2 в ответе бери только из расходных категорий ниже.

Расходы (факт с начала месяца): ${data.totalExpenseCurrent.toFixed(0)} ${data.defaultCurrency}
Расходы в прошлом месяце: ${data.totalExpensePrev.toFixed(0)} ${data.defaultCurrency} (изменение ≈ ${deltaPercent}%)
Прогноз РАСХОДОВ до конца ЭТОГО месяца (линейно по прошедшим дням): ~${data.projectedExpenseEom.toFixed(0)} ${
      data.defaultCurrency
    }
День месяца: ${data.daysPassed} из ${data.daysInMonth}

${netBlock}

Топ категорий расходов:
${currentTop || "  (нет расходов)"}

Ответ: 1–2 коротких абзаца. Сравни расходы с прошлым месяцем, назови топ-2 категории расходов, один совет по экономии. Если доходов нет — не упоминай зарплату и баланс.
${voiceHint}
Кратко, без воды.`;

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: voice === "modern_18" ? 0.75 : 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Сформируй месячный отчёт: только расходы в топе, горизонт — конец текущего месяца, не год.",
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content ?? "Не удалось сформировать отчёт.";
  }
}
