import OpenAI from "openai";
import { ParsedDebt } from "../../domain/models/debt";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const SYSTEM_PROMPT = `Ты — ассистент для распознавания долгов из сообщений.
Пользователь пишет о том, что он кому-то одолжил или занял у кого-то.

Верни JSON только если сообщение явно о долге. Если это расход (покупка, трата) — верни {"isDebt": false}.
Формат для долга: {"isDebt": true, "iAmCreditor": bool, "otherPersonName": "имя", "amount": число, "currency": "BYN"|"RUB"|"RUBLES"|"USD"|"EUR", "deadlineHint": "строка или null"}

Правила:
- iAmCreditor: true = я одолжил (мне должны). "одолжил Саше 100", "Саша должен мне", "дал в долг Пете"
- iAmCreditor: false = я занял (я должен). "одолжил у Саши 100", "занял у Маши", "я должен Саше"
- otherPersonName: имя человека без @ (просто "Саша", "Маша")
- amount: число
- currency: BYN, RUB, USD, EUR. ВАЖНО для рублей:
  - "белорусские рубли", "бел.руб", "бр" → "BYN"
  - "российские рубли", "рос.руб", "р" (явно РФ) → "RUB"
  - если сказано просто "рубли" или "руб" без уточнения — верни "RUBLES" (для обработки по настройкам пользователя)
- deadlineHint: "до конца месяца", "до 15.03" или null

Примеры:
"одолжил Саше 100р до конца месяца" → {"isDebt": true, "iAmCreditor": true, "otherPersonName": "Саша", "amount": 100, "currency": "RUBLES", "deadlineHint": "до конца месяца"}
"одолжил у Саши 100 рублей" → {"isDebt": true, "iAmCreditor": false, "otherPersonName": "Саша", "amount": 100, "currency": "RUBLES", "deadlineHint": null}
"купил молоко 50р" → {"isDebt": false}
Верни только JSON без markdown.`;

interface RawParsed {
  isDebt?: boolean;
  iAmCreditor?: boolean;
  otherPersonName?: string;
  amount?: number;
  currency?: string;
  deadlineHint?: string | null;
}

export class DeepSeekDebtParser {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async parse(text: string, defaultCurrency?: string | null): Promise<ParsedDebt | null> {
    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed: RawParsed = JSON.parse(content);
    if (!parsed.isDebt || parsed.amount == null || parsed.amount <= 0) {
      return null;
    }

    const name = (parsed.otherPersonName || "").trim();
    if (!name) return null;

    const currency = this.resolveCurrency(text, parsed.currency ?? "", defaultCurrency);

    return {
      iAmCreditor: parsed.iAmCreditor ?? true,
      otherPersonName: name,
      amount: Number(parsed.amount),
      currency,
      deadlineHint: parsed.deadlineHint?.trim() || undefined,
    };
  }

  private resolveCurrency(
    rawText: string,
    parsedCurrency: string,
    defaultCurrency?: string | null
  ): string {
    const lower = rawText.toLowerCase();
    const c = (parsedCurrency || "").trim().toUpperCase();

    // Явное указание в тексте
    if (/белорусск|бел\.?\s*руб|byn/i.test(lower)) return "BYN";
    if (/российск|росийск|рос\.?\s*руб|руб\s*рф/i.test(lower)) return "RUB";

    // Generic "рубли" (RUBLES от LLM или RUB при "руб"/"р" в тексте) → по defaultCurrency
    const hasGenericRubles =
      c === "RUBLES" ||
      /^руб(л(ей|я|и)?)?$/i.test(c) ||
      /^руб$/i.test(c) ||
      (["RUB"].includes(c) && /руб|\d+\s*р\b/i.test(lower));
    if (hasGenericRubles) {
      const def = (defaultCurrency || "").toUpperCase();
      if (def === "BYN" || def === "RUB") return def;
      return "RUB";
    }

    // Явные коды валют — возвращаем как есть
    if (["BYN", "RUB", "USD", "EUR"].includes(c)) return c;
    return defaultCurrency || "RUB";
  }
}
