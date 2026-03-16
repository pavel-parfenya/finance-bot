import { ParsedExpense } from "../models/expense";

export interface ParseContext {
  defaultCurrency?: string | null;
}

export interface IMessageParser {
  parse(text: string, context?: ParseContext): Promise<ParsedExpense>;
}
