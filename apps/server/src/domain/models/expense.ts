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
  category: ExpenseCategory;
  amount: number;
  currency: string;
  store: string;
}

export interface Expense extends ParsedExpense {
  date: Date;
  username: string;
}
