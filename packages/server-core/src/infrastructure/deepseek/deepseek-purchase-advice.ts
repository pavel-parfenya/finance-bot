import OpenAI from "openai";
import { analyticsVoiceHint } from "./deepseek-analytics-voice-hints";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const PURCHASE_QUESTION_PATTERNS = [
  /могу\s+ли\s+я\s+купить/i,
  /стоит\s+ли\s+купить/i,
  /можно\s+ли\s+купить/i,
  /позволить\s+себе/i,
  /могу\s+ли\s+позволить/i,
  /стоит\s+ли\s+брать/i,
];

export interface ParsedPurchaseQuestion {
  item: string;
  amount: number;
  currency: string;
}

export function isPurchaseAdviceQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 15) return false;
  return PURCHASE_QUESTION_PATTERNS.some((p) => p.test(trimmed));
}

const PARSE_SYSTEM = `Ты — парсер вопросов о покупках. Пользователь спрашивает "могу ли я купить X за Y рублей" и т.п.
Верни JSON: {"item": "название товара", "amount": число, "currency": "BYN"|"RUB"|"USD"|"EUR"}
Если не удалось извлечь — верни {"item": "", "amount": 0, "currency": ""}
Только JSON, без markdown.`;

function resolveCurrency(raw: string, defaultCurrency?: string | null): string {
  const u = raw.toUpperCase();
  if (u === "BYN" || u === "БР" || u === "БЕЛ") return "BYN";
  if (u === "RUB" || u === "RUBLES" || u === "Р" || u === "РУБ") return "RUB";
  if (u === "USD" || u === "ДОЛЛ") return "USD";
  if (u === "EUR" || u === "ЕВРО") return "EUR";
  return defaultCurrency?.trim() || "USD";
}

export interface SpendingContext {
  byCategory: Array<{ category: string; amount: string }>;
  totalCurrentMonth: string;
  forecastEndOfMonth: string;
  defaultCurrency: string;
}

export class DeepSeekPurchaseAdviceParser {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async parse(
    text: string,
    defaultCurrency?: string | null
  ): Promise<ParsedPurchaseQuestion | null> {
    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PARSE_SYSTEM },
        { role: "user", content: text },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      item?: string;
      amount?: number;
      currency?: string;
    };
    const item = (parsed.item ?? "").trim();
    const amount = Number(parsed.amount) || 0;
    if (!item || amount <= 0) return null;

    const currency = resolveCurrency(parsed.currency ?? "", defaultCurrency);
    return { item, amount, currency };
  }

  async generateAdvice(
    question: ParsedPurchaseQuestion,
    spending: SpendingContext,
    voice: string
  ): Promise<string> {
    const voiceHint = analyticsVoiceHint(voice);
    const categoriesText = spending.byCategory
      .slice(0, 10)
      .map((c) => `  - ${c.category}: ${c.amount} ${spending.defaultCurrency}`)
      .join("\n");

    const systemPrompt = `Ты — финансовый советник. Пользователь спрашивает, стоит ли купить ${question.item} за ${question.amount} ${question.currency}.
У него такие траты за текущий месяц:
${categoriesText}
Итого: ${spending.totalCurrentMonth} ${spending.defaultCurrency}
Прогноз до конца месяца: ~${spending.forecastEndOfMonth} ${spending.defaultCurrency}

Дай краткий совет (2-3 предложения): стоит ли покупать, с учётом трат. Без дохода — ориентируйся на средние траты и прогноз.
${voiceHint}
Ответь только текстом совета, без вступления.`;

    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: voice === "modern_18" ? 0.75 : 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Вопрос: ${question.item} за ${question.amount} ${question.currency}. Стоит ли?`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content ?? "Не удалось сформировать совет.";
  }
}
