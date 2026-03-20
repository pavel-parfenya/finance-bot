/** Результат агрегации транзакций по категориям и валютам */
export interface AggregatedAnalytics {
  byCategory: Array<{ category: string; amount: string }>;
  byCurrency: Array<{ currency: string; amount: string }>;
  totalInDefault: string;
}

/** Транзакция в минимальном виде для агрегации */
export interface TransactionForAggregation {
  amount: number | string;
  currency: string | null;
  category: string | null;
}

/** Типы инсайтов аналитики */
export type InsightType =
  | "category_spike"
  | "month_forecast"
  | "top_category"
  | "vs_prev_month_total"
  | "vs_prev_month_category";

/** Характер голоса бота */
export type AnalyticsVoice = "official" | "strict" | "modern" | "modern_18";

/** Данные инсайта (зависят от типа) */
export interface InsightData {
  category?: string;
  amount?: string | number;
  percent?: number;
  currency?: string;
  prevAmount?: string | number;
  currentAmount?: string | number;
  deltaPercent?: number;
  deltaAmount?: string | number;
}

/** Один инсайт для отправки пользователю */
export interface Insight {
  type: InsightType;
  data: InsightData;
  priority: number;
}

/** Сводка трат за период (для инсайтов и purchase advice) */
export interface SpendingSummary {
  byCategory: Map<string, number>;
  totalInDefault: number;
  defaultCurrency: string;
  periodLabel?: string;
}
