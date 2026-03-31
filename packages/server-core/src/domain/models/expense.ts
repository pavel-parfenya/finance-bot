export type TransactionType = "expense" | "income";

export enum IncomeCategory {
  Salary = "Зарплата",
  Freelance = "Фриланс",
  Gifts = "Подарки",
  Sale = "Продажа",
  Refund = "Возврат",
  Other = "Другое",
}

export enum ExpenseCategory {
  Groceries = "Продукты",
  Transport = "Транспорт",
  Entertainment = "Развлечения",
  Healthcare = "Здоровье",
  Utilities = "Коммунальные",
  Dining = "Кафе и рестораны",
  Clothing = "Одежда и обувь",
  Electronics = "Электроника",
  Beauty = "Красота",
  Sports = "Спорт",
  Pets = "Животные",
  Kids = "Дети",
  Gifts = "Подарки",
  Subscriptions = "Подписки",
  Education = "Образование",
  Housing = "Жильё",
  Furniture = "Мебель и дом",
  Auto = "Авто",
  Travel = "Путешествия",
  Communication = "Связь и интернет",
  Taxes = "Налоги и сборы",
  PersonalCare = "Личная гигиена",
  Other = "Другое",
}

export interface ParsedExpense {
  description: string;
  category: string;
  amount: number;
  currency: string;
  store: string;
  type: TransactionType;
}

export interface Expense extends ParsedExpense {
  date: Date;
  username: string;
}
