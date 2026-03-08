import { Expense } from "../models/expense";

export interface IMessageParser {
  parse(text: string): Promise<Omit<Expense, "username">>;
}
