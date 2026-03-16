import OpenAI from "openai";
import { IMessageParser } from "../../domain/interfaces";
import { ParseContext } from "../../domain/interfaces/message-parser";
import { ParsedExpense, ExpenseCategory } from "../../domain/models";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const SYSTEM_PROMPT = `Ты — финансовый ассистент, который извлекает данные о расходах из сообщений пользователя.
Разбери сообщение и верни JSON-объект с полями:
- description: что было куплено (строка, на русском)
- category: одна из [${Object.values(ExpenseCategory).join(", ")}]
- amount: потраченная сумма (число)
- currency: код валюты — BYN, USD, EUR и т.д. (строка). ВАЖНО для рублей:
  - "белорусские рубли", "бел.руб", "Br" → "BYN"
  - "российские рубли", "рос.руб" → "RUB"
  - если сказано просто "рубли" без уточнения — верни "RUBLES" (специальное значение для последующей обработки)
- store: где была совершена покупка, или "Неизвестно" если не указано (строка)

Правила валюты:
- Если "$" — "USD". Если "€" — "EUR". Если "£" — "GBP".
- Для рублей: всегда явно различай BYN и RUB. При неоднозначном "рубли" возвращай "RUBLES".
- Если сумма не указана, amount = 0.
- Выбери наиболее подходящую категорию из списка. Примеры:
  - одежда, обувь, штаны, куртка, кроссовки → "Одежда и обувь"
  - телефон, наушники, ноутбук → "Электроника"
  - стрижка, маникюр, косметика → "Красота"
  - бензин, ТО, шиномонтаж → "Авто"
  - корм для кошки, ветеринар → "Животные"
  - Netflix, Spotify, подписка → "Подписки"
  - диван, посуда, полотенца → "Мебель и дом"
  - мяч, абонемент в зал, лыжи → "Спорт"
  - игрушки, школьные принадлежности → "Дети"
  - цветы, подарок на день рождения → "Подарки"
  - отель, билеты на самолёт → "Путешествия"
  - мобильная связь, домашний интернет → "Связь и интернет"
  - штраф, госпошлина, налог → "Налоги и сборы"
- Всегда возвращай валидный JSON без markdown-обёрток.`;

interface RawParsed {
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

    return {
      description: parsed.description,
      category: this.resolveCategory(parsed.category),
      amount: parsed.amount,
      currency,
      store: parsed.store ?? "Неизвестно",
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

    // Generic "рубли" → используем defaultCurrency или RUB
    const isGenericRubles = cur === "RUBLES" || /^руб(л(ей|я|и)?)?$/i.test(cur);
    if (isGenericRubles) {
      if (defaultCurrency === "BYN" || defaultCurrency === "RUB") return defaultCurrency;
      return "RUB";
    }

    return cur || "RUB";
  }

  private resolveCategory(raw: string): ExpenseCategory {
    const match = Object.values(ExpenseCategory).find(
      (c) => c.toLowerCase() === raw.toLowerCase()
    );
    return match ?? ExpenseCategory.Other;
  }
}
