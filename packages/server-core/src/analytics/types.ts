/** Результат агрегации транзакций по категориям и валютам */
export interface AggregatedAnalytics {
  byCategory: Array<{ category: string; amount: string }>;
  byCurrency: Array<{ currency: string; amount: string }>;
  totalInDefault: string;
  totalIncomeInDefault?: string;
  totalExpenseInDefault?: string;
  /** true если есть доходы за период — тогда показываем баланс и разбивку */
  hasIncome?: boolean;
}

/** Транзакция в минимальном виде для агрегации */
export interface TransactionForAggregation {
  amount: number | string;
  currency: string | null;
  category: string | null;
  type?: string;
}

/** Характер голоса бота (месячный отчёт и др.) */
export type AnalyticsVoice = "official" | "strict" | "modern" | "modern_18";

/** Сводка трат за период (для purchase advice и др.) */
export interface SpendingSummary {
  byCategory: Map<string, number>;
  totalInDefault: number;
  defaultCurrency: string;
  periodLabel?: string;
}
