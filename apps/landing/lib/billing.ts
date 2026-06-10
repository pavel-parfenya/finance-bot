const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000").replace(
  /\/$/,
  ""
);

export type SubscriptionPlan = "free" | "pro_month" | "pro_year";
export type SubscriptionStatus = "active" | "canceled" | "expired" | "past_due";

export interface BillingSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startsAt: string | null;
  expiresAt: string | null;
}

export interface BillingMe {
  user: {
    id: number;
    telegramId: number;
    username: string | null;
    defaultCurrency: string | null;
  };
  subscription: BillingSubscription;
}

export type BillingMeResult =
  | { ok: true; data: BillingMe }
  | { ok: false; error: string };

/** Запрос `GET /api/billing/me?token=…` к API (SSR, без кэша — токен персональный). */
export async function getBillingMe(token: string): Promise<BillingMeResult> {
  try {
    const res = await fetch(
      `${API_URL}/api/billing/me?token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: body?.error ?? "Не удалось загрузить данные" };
    }
    const data = (await res.json()) as BillingMe;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Сервис временно недоступен" };
  }
}
