import { Expense } from "../models/expense";

export interface ISheetManager {
  initSheet(sheetId: string): Promise<void>;
  appendExpense(sheetId: string, expense: Expense): Promise<void>;
}
