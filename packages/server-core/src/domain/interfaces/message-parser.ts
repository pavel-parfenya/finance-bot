import { ParsedExpense } from "../models/expense";

export interface ParseContext {
  defaultCurrency?: string | null;
  customCategories?: Array<{ name: string; description: string }>;
  /** Активные события пользователя — для авто-привязки траты по ключевым словам. */
  events?: Array<{ name: string; description: string; keywords: string }>;
}

export interface IMessageParser {
  parse(text: string, context?: ParseContext): Promise<ParsedExpense>;
}
