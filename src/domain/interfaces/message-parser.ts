import { ParsedExpense } from "../models/expense";

export interface IMessageParser {
  parse(text: string): Promise<ParsedExpense>;
}
