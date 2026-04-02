import type {
  TransactionDto,
  TransactionFilters,
  TransactionUpdateRequest,
  TransactionsResponse,
  AnalyticsResponse,
  WorkspaceInfo,
  UserSettings,
  AppUserStatsResponse,
  DebtDto,
  DebtCreateRequest,
  DebtUpdateRequest,
  CustomCategoryDto,
  CustomCategoryCreateRequest,
  CustomCategoryUpdateRequest,
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
  if (filters?.type) params.set("type", filters.type);
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
  endDate?: string,
  userId?: number
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({ period });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (userId) params.set("userId", String(userId));
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

export async function markInfoChangelogSeen(): Promise<{
  ok?: boolean;
  error?: string;
}> {
  const res = await fetch(`${BASE}/api/user/info-changelog-seen`, {
    method: "POST",
    headers: headers(),
  });
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

export async function setMemberFullAccess(
  targetUserId: number,
  fullAccess: boolean
): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/workspace/member/${targetUserId}/full-access`, {
    method: "PATCH",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ fullAccess }),
  });
  return res.json();
}

export async function fetchUserSettings(): Promise<UserSettings> {
  const res = await fetch(`${BASE}/api/user/settings`, { headers: headers() });
  return res.json();
}

export async function fetchAppUserStats(
  from: string,
  to: string
): Promise<AppUserStatsResponse | { error?: string }> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`${BASE}/api/admin/app-user-stats?${params}`, {
    headers: headers(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof data["message"] === "string" ? data["message"] : null;
    const nested =
      data["error"] && typeof data["error"] === "object" && data["error"] !== null
        ? (data["error"] as { error?: string }).error
        : null;
    const flat = typeof data["error"] === "string" ? data["error"] : null;
    const msg = flat ?? nested ?? message ?? `Ошибка ${String(res.status)}`;
    return { error: msg };
  }
  return data as AppUserStatsResponse;
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

export async function fetchCustomCategories(): Promise<{
  categories?: CustomCategoryDto[];
  error?: string;
}> {
  const res = await fetch(`${BASE}/api/workspace/categories`, { headers: headers() });
  return res.json();
}

export async function createCustomCategory(
  body: CustomCategoryCreateRequest
): Promise<{ category?: CustomCategoryDto; error?: string }> {
  const res = await fetch(`${BASE}/api/workspace/categories`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateCustomCategory(
  id: number,
  body: CustomCategoryUpdateRequest
): Promise<{ category?: CustomCategoryDto; error?: string }> {
  const res = await fetch(`${BASE}/api/workspace/categories/${id}`, {
    method: "PATCH",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteCustomCategory(
  id: number
): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/workspace/categories/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  return res.json();
}
