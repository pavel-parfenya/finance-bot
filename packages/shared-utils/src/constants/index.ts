export const CURRENCIES = ["BYN", "USD", "EUR", "RUB", "UAH", "KZT", "PLN"] as const;

export type Currency = (typeof CURRENCIES)[number];

/** Category display names (for UI). Server uses ExpenseCategory enum for parsing. */
export const CATEGORY_LABELS = [
  "Продукты",
  "Транспорт",
  "Развлечения",
  "Здоровье",
  "Коммунальные",
  "Кафе и рестораны",
  "Одежда и обувь",
  "Электроника",
  "Красота",
  "Спорт",
  "Животные",
  "Дети",
  "Подарки",
  "Подписки",
  "Образование",
  "Жильё",
  "Мебель и дом",
  "Авто",
  "Путешествия",
  "Связь и интернет",
  "Налоги и сборы",
  "Личная гигиена",
  "Другое",
] as const;
