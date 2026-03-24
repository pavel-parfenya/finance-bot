import { ParsedExpense } from "../models/expense";

export interface ParseContext {
  defaultCurrency?: string | null;
  customCategories?: Array<{ name: string; description: string }>;
}

export interface IMessageParser {
  parse(text: string, context?: ParseContext): Promise<ParsedExpense>;
}
