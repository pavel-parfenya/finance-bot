import OpenAI from "openai";
import { IMessageParser } from "../../domain/interfaces";
import { ParseContext } from "../../domain/interfaces/message-parser";
import type { ParsedExpense } from "../../domain/models";
import { ExpenseCategory, IncomeCategory } from "../../domain/models";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const EXPENSE_CATS = Object.values(ExpenseCategory).join(", ");
const INCOME_CATS = Object.values(IncomeCategory).join(", ");

function buildSystemPrompt(
  customCategories?: Array<{ name: string; description: string }>,
  defaultCurrencyHint?: string | null
): string {
  let customBlock = "";
  if (customCategories && customCategories.length > 0) {
    const list = customCategories.map((c) => `"${c.name}" (${c.description})`).join(", ");
    customBlock = `\nТакже у пользователя есть пользовательские категории расходов: [${list}]. Если расход подходит под одну из пользовательских категорий, используй её название вместо стандартных. Пользовательские категории имеют приоритет.`;
  }

  const dc = (defaultCurrencyHint || "").trim().toUpperCase();
  const currencyRules =
    dc === "BYN" || dc === "RUB"
      ? `\nВалюта по умолчанию у пользователя в приложении: ${dc}.
Правила для поля currency:
- USD, EUR, GBP, PLN, UAH и т.д. — если в тексте явно указана эта валюта или символ ($, €, £).
- BYN — только если в тексте явно: белорусские рубли, бел. руб., BYN, б.р., «бел руб» и т.п.
- RUB — только если в тексте явно: российские рубли, рос. руб., руб РФ, ₽ (и однозначно российский контекст).
- Если пользователь пишет просто «рублей», «рубля», «р.», «руб» без уточнения страны — НЕ угадывай BYN или RUB. Верни в поле currency строку RUBLES: система подставит валюту по умолчанию (${dc}).`
      : `\nПравила для поля currency:
- USD, EUR, BYN, RUB и т.д. — если в тексте однозначно указана валюта или страна (белорусские / российские рубли, BYN, $, €).
- Если написано только «рубли», «рублей», «р.» без уточнения — верни RUBLES (не RUB и не BYN).`;

  return `Ты — финансовый ассистент, который извлекает данные о расходах и доходах из сообщений пользователя.
Сначала определи тип: "expense" (расход/трата) или "income" (доход/поступление).
Примеры дохода: зарплата, получил, заработал, фриланс, продал, подарок наличными, возврат денег.
Примеры расхода: купил, потратил, оплатил, обед, бензин.

Верни JSON с полями:
- type: "expense" или "income"
- description: что за операция (строка, на русском)
- category: для expense — одна из [${EXPENSE_CATS}]. Для income — одна из [${INCOME_CATS}]${customBlock}
- amount: сумма (число, всегда положительное)
- currency: код валюты (например USD, EUR, BYN, RUB) или RUBLES — см. правила ниже.${currencyRules}
- store: где (для расхода) или источник (для дохода), или "Неизвестно"

Примеры:
- "купил молоко 5 BYN" → type: "expense", category: "Продукты", currency: "BYN"
- "купил макароны за 6 рублей" (без слов «российские»/«белорусские») → currency: "RUBLES"
- "получил зарплату 5000 BYN" → type: "income", category: "Зарплата", currency: "BYN"
- "доход от фриланса 200$" → type: "income", category: "Фриланс", currency: "USD"
- "продал велосипед 150р" → type: "income", category: "Продажа", currency: "RUBLES"
- Если сумма не указана, amount = 0. Всегда валидный JSON без markdown.`;
}

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
    const systemPrompt = buildSystemPrompt(
      context?.customCategories,
      context?.defaultCurrency
    );
    const response = await this.client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
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
    const customNames = context?.customCategories?.map((c) => c.name) ?? [];
    const category = this.resolveCategory(parsed.category, type, customNames);

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
    const def = defaultCurrency?.trim().toUpperCase();

    const explicitByn = /белорусск|бел\.?\s*руб|byn|\bb\.р\.|бел\s*руб/i.test(lower);
    const explicitRub = /российск|рос\.?\s*руб|руб\s*рф|рф\s*руб|₽/i.test(lower);

    if (explicitByn) return "BYN";
    if (explicitRub) return "RUB";

    // «6 рублей», «100 р.», «50 р» — без уточнения страны: валюта по умолчанию пользователя
    const hasGenericRubleInText =
      /руб(?:лей|ля|ль|ли|лям|ях)?\b/i.test(lower) ||
      /\d+\s*р\./i.test(lower) ||
      /\d+\s+р\b/i.test(lower) ||
      /\d+р\b/i.test(lower);

    if (hasGenericRubleInText) {
      if (def === "BYN" || def === "RUB") return def;
      if (cur === "RUBLES") return "BYN";
      // Модель часто ставит RUB/BYN при «рублей» без страны — не доверяем, как и для RUBLES
      if (cur === "RUB" || cur === "BYN") return "BYN";
    }

    const isGenericRubles = cur === "RUBLES" || /^руб(л(ей|я|и)?)?$/i.test(cur);
    if (isGenericRubles) {
      if (def === "BYN" || def === "RUB") return def;
      return "BYN";
    }

    return cur || "BYN";
  }

  private resolveCategory(
    raw: string,
    type: "expense" | "income",
    customNames: string[] = []
  ): string {
    const customMatch = customNames.find((c) => c.toLowerCase() === raw.toLowerCase());
    if (customMatch) return customMatch;

    const list =
      type === "income" ? Object.values(IncomeCategory) : Object.values(ExpenseCategory);
    const match = list.find((c) => c.toLowerCase() === raw.toLowerCase());
    return match ?? (type === "income" ? IncomeCategory.Other : ExpenseCategory.Other);
  }
}
