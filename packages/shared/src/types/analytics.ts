export interface AnalyticsCategoryItem {
  category: string;
  amount: string;
}

export interface AnalyticsCurrencyItem {
  currency: string;
  amount: string;
}

export interface AnalyticsResponse {
  byCategory?: AnalyticsCategoryItem[];
  byCurrency?: AnalyticsCurrencyItem[];
  totalInDefault?: string;
  defaultCurrency?: string;
  periodLabel?: string;
  error?: string;
}

export interface AnalyticsParams {
  period: string;
  startDate?: string;
  endDate?: string;
  /** Фильтр по участнику (при 2+ в workspace) */
  userId?: number;
}
