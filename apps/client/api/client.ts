import type {
  TransactionDto,
  TransactionFilters,
  TransactionUpdateRequest,
  TransactionsResponse,
  AnalyticsResponse,
  WorkspaceInfo,
  UserSettings,
  DebtDto,
  DebtCreateRequest,
  DebtUpdateRequest,
} from "@finance-bot/shared";

const BASE = typeof window !== "undefined" ? window.location.origin : "";

function getInitData(): string {
  const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
    .Telegram?.WebApp;
  return tg?.initData ?? "";
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const init = getInitData();
  if (init) h["X-Telegram-Init-Data"] = init;
  return h;
}

const DEFAULT_PAGE_SIZE = 20;

export async function fetchTransactions(
  filters?: TransactionFilters,
  page?: { limit?: number; offset?: number }
): Promise<TransactionsResponse | { error?: string }> {
  const params = new URLSearchParams();
  if (filters?.period) params.set("period", filters.period);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.currency) params.set("currency", filters.currency);
  if (filters?.userId) params.set("userId", String(filters.userId));
  if (filters?.search) params.set("search", filters.search);
  const limit = page?.limit ?? filters?.limit ?? DEFAULT_PAGE_SIZE;
  const offset = page?.offset ?? filters?.offset ?? 0;
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const url = `${BASE}/api/transactions?${params}`;
  const res = await fetch(url, { headers: headers() });
  return res.json();
}

export async function fetchCategories(): Promise<{
  categories?: string[];
  error?: string;
}> {
  const res = await fetch(`${BASE}/api/transactions/categories`, {
    headers: headers(),
  });
  return res.json();
}

export async function fetchAnalytics(
  period: string,
  startDate?: string,
  endDate?: string
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({ period });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const res = await fetch(`${BASE}/api/transactions/analytics?${params}`, {
    headers: headers(),
  });
  return res.json();
}

export async function updateTransaction(
  id: number,
  updates: TransactionUpdateRequest
): Promise<{ transaction?: TransactionDto; error?: string }> {
  const res = await fetch(`${BASE}/api/transactions/${id}`, {
    method: "PATCH",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteTransaction(
  id: number
): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/transactions/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  return res.json();
}

export async function fetchWorkspaceInfo(): Promise<WorkspaceInfo> {
  const res = await fetch(`${BASE}/api/workspace/info`, { headers: headers() });
  return res.json();
}

export async function inviteUser(
  username: string
): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/workspace/invite`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  return res.json();
}

export async function fetchUserSettings(): Promise<UserSettings> {
  const res = await fetch(`${BASE}/api/user/settings`, { headers: headers() });
  return res.json();
}

export async function updateUserSettings(updates: {
  defaultCurrency?: string | null;
  analyticsEnabled?: boolean;
  analyticsVoice?: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/user/settings`, {
    method: "PATCH",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function setDefaultCurrency(
  currency: string
): Promise<{ ok?: boolean; error?: string }> {
  return updateUserSettings({ defaultCurrency: currency });
}

export async function fetchDebts(): Promise<{
  debts?: DebtDto[];
  error?: string;
}> {
  const res = await fetch(`${BASE}/api/debts`, { headers: headers() });
  return res.json();
}

export async function createDebt(
  body: DebtCreateRequest
): Promise<{ debt?: DebtDto; error?: string }> {
  const res = await fetch(`${BASE}/api/debts`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateDebt(
  id: number,
  updates: DebtUpdateRequest
): Promise<{ debt?: DebtDto; error?: string }> {
  const res = await fetch(`${BASE}/api/debts/${id}`, {
    method: "PATCH",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function deleteDebt(id: number): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/debts/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  return res.json();
}
