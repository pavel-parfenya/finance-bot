import OpenAI from "openai";
import { IMessageParser } from "../../domain/interfaces";
import { Expense, ExpenseCategory } from "../../domain/models";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const SYSTEM_PROMPT = `Ты — финансовый ассистент, который извлекает данные о расходах из сообщений пользователя.
Разбери сообщение и верни JSON-объект с полями:
- description: что было куплено (строка, на русском)
- category: одна из [${Object.values(ExpenseCategory).join(", ")}]
- amount: потраченная сумма (число)
- currency: код валюты — BYN, USD, EUR и т.д. (строка)
- store: где была совершена покупка, или "Неизвестно" если не указано (строка)

Правила:
- По умолчанию валюта — "BYN" (белорусский рубль). Если символ "Br" или "бел. руб." или валюта не указана — используй "BYN". Если "$" — "USD". Если "€" — "EUR". Если "£" — "GBP". Иначе определи из контекста.
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

interface ParsedExpense {
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

  async parse(text: string): Promise<Omit<Expense, "username">> {
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

    const parsed: ParsedExpense = JSON.parse(content);

    return {
      date: new Date(),
      description: parsed.description,
      category: this.resolveCategory(parsed.category),
      amount: parsed.amount,
      currency: parsed.currency,
      store: parsed.store ?? "Неизвестно",
    };
  }

  private resolveCategory(raw: string): ExpenseCategory {
    const match = Object.values(ExpenseCategory).find(
      (c) => c.toLowerCase() === raw.toLowerCase()
    );
    return match ?? ExpenseCategory.Other;
  }
}
