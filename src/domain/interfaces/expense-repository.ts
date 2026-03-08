import { Expense } from "../models/expense";

export interface IExpenseRepository {
  save(expense: Expense): Promise<void>;
}
