export interface ParsedDebt {
  /** true = я одолжил (кредитор), false = я занял (должник) */
  iAmCreditor: boolean;
  /** Имя того, кому должны / кто должен. "Саша" */
  otherPersonName: string;
  amount: number;
  currency: string;
  /** "до конца месяца", "до 15 числа" и т.д. — для дедлайна */
  deadlineHint?: string;
}
