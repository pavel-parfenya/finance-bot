import OpenAI from "openai";
import { IMessageParser } from "../../domain/interfaces";
import { ParseContext } from "../../domain/interfaces/message-parser";
import type { ParsedExpense } from "../../domain/models";
import { ExpenseCategory, IncomeCategory } from "../../domain/models";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const EXPENSE_CATS = Object.values(ExpenseCategory).join(", ");
const INCOME_CATS = Object.values(IncomeCategory).join(", ");

const SYSTEM_PROMPT = `Ты — финансовый ассистент, который извлекает данные о расходах и доходах из сообщений пользователя.
Сначала определи тип: "expense" (расход/трата) или "income" (доход/поступление).
Примеры дохода: зарплата, получил, заработал, фриланс, продал, подарок наличными, возврат денег.
Примеры расхода: купил, потратил, оплатил, обед, бензин.

Верни JSON с полями:
- type: "expense" или "income"
- description: что за операция (строка, на русском)
- category: для expense — одна из [${EXPENSE_CATS}]. Для income — одна из [${INCOME_CATS}]
- amount: сумма (число, всегда положительное)
- currency: BYN, USD, EUR и т.д. Для рублей: "бел.руб"→"BYN", "рос.руб"→"RUB", неясно→"RUBLES"
- store: где (для расхода) или источник (для дохода), или "Неизвестно"

Примеры:
- "купил молоко 5 BYN" → type: "expense", category: "Продукты"
- "получил зарплату 5000 BYN" → type: "income", category: "Зарплата"
- "доход от фриланса 200$" → type: "income", category: "Фриланс"
- "продал велосипед 150р" → type: "income", category: "Продажа"
- Если сумма не указана, amount = 0. Всегда валидный JSON без markdown.`;

interface RawParsed {
  type?: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  store: string;
}

export class DeepSeekMessageParser implements IMessageParser {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async parse(text: string, context?: ParseContext): Promise<ParsedExpense> {
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
    if (!content) {
      throw new Error("Пустой ответ от DeepSeek");
    }

    const parsed: RawParsed = JSON.parse(content);
    const currency = this.resolveCurrency(
      text,
      parsed.currency,
      context?.defaultCurrency
    );
    const type = parsed.type === "income" ? "income" : "expense";
    const category = this.resolveCategory(parsed.category, type);

    return {
      description: parsed.description,
      category,
      amount: parsed.amount,
      currency,
      store: parsed.store ?? "Неизвестно",
      type,
    };
  }

  private resolveCurrency(
    rawText: string,
    parsedCurrency: string,
    defaultCurrency?: string | null
  ): string {
    const lower = rawText.toLowerCase();
    const cur = (parsedCurrency || "").trim().toUpperCase();

    // Явное указание в тексте
    if (/белорусск|бел\.?\s*руб|byn/i.test(lower)) return "BYN";
    if (/российск|росийск|рос\.?\s*руб|руб\s*рф/i.test(lower)) return "RUB";

    // Generic "рубли" → используем defaultCurrency или BYN (приоритет для неоднозначных рублей)
    const isGenericRubles = cur === "RUBLES" || /^руб(л(ей|я|и)?)?$/i.test(cur);
    if (isGenericRubles) {
      if (defaultCurrency === "BYN" || defaultCurrency === "RUB") return defaultCurrency;
      return "BYN";
    }

    return cur || "BYN";
  }

  private resolveCategory(raw: string, type: "expense" | "income"): string {
    const list =
      type === "income" ? Object.values(IncomeCategory) : Object.values(ExpenseCategory);
    const match = list.find((c) => c.toLowerCase() === raw.toLowerCase());
    return match ?? (type === "income" ? IncomeCategory.Other : ExpenseCategory.Other);
  }
}
