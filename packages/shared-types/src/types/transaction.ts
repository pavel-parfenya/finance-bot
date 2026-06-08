export type TransactionType = "expense" | "income";

export interface TransactionDto {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: string;
  currency: string;
  type: TransactionType;
  /** Кто добавил (показывать только при 2+ участниках) */
  personDisplayName?: string;
}

export interface TransactionFilters {
  period?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  currency?: string;
  userId?: number;
  type?: TransactionType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionsResponse {
  transactions: TransactionDto[];
  hasMore: boolean;
}

export interface TransactionUpdateRequest {
  description?: string;
  category?: string;
  amount?: number;
  currency?: string;
  date?: string;
  type?: TransactionType;
}
