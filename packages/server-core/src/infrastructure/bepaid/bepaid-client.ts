/**
 * Клиент платёжного провайдера bePaid (https://docs.bepaid.by).
 *
 * Используется механизм рекуррентных подписок bePaid (api.bepaid.by):
 * - `POST {apiBaseUrl}/plans` + `GET {apiBaseUrl}/plans` — создаёт/находит план
 *   (сумма, валюта, интервал списания).
 * - `POST {apiBaseUrl}/subscriptions` — создаёт подписку по плану; возвращает
 *   `redirect_url` (страница ввода карты) и `id` (`sbs_…`).
 * - `GET {apiBaseUrl}/subscriptions/{id}` — статус подписки для верификации webhook
 *   (тело notify не доверяем — состояние подтверждаем повторным запросом к bePaid).
 * - `POST {apiBaseUrl}/subscriptions/{id}/cancel` — остановка автопродления.
 *
 * После создания подписки bePaid сам списывает оплату по расписанию плана и шлёт
 * notify-webhook при каждом продлении (`state: active`, `active_to`).
 *
 * Аутентификация — HTTP Basic (shop_id:secret_key).
 */

import type {
  BepaidConfig,
  PlanInput,
  SubscriptionInput,
  SubscriptionResponse,
  VerifiedSubscription,
} from "./bepaid-client.types";

export type {
  BepaidConfig,
  PlanInput,
  SubscriptionInput,
  SubscriptionResponse,
  VerifiedSubscription,
};

function authHeader(config: BepaidConfig): string {
  const raw = `${config.shopId}:${config.secretKey}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

function jsonHeaders(config: BepaidConfig): Record<string, string> {
  return {
    Authorization: authHeader(config),
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Version": "2",
  };
}

/** Извлекает массив планов из разных форм ответа bePaid. */
function asPlanList(json: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(json)) return json as Array<Record<string, unknown>>;
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    for (const key of ["plans", "data"]) {
      if (Array.isArray(obj[key])) return obj[key] as Array<Record<string, unknown>>;
    }
  }
  return [];
}

/** Находит id плана по заголовку среди существующих (идемпотентность создания). */
async function findPlanIdByTitle(
  config: BepaidConfig,
  title: string
): Promise<string | null> {
  const res = await fetch(`${config.apiBaseUrl}/plans`, {
    method: "GET",
    headers: jsonHeaders(config),
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as unknown;
  for (const plan of asPlanList(json)) {
    if (plan.title === title && typeof plan.id === "string" && plan.id) {
      return plan.id;
    }
  }
  return null;
}

/**
 * Возвращает id плана bePaid для заданных параметров: ищет существующий по
 * `title`, иначе создаёт новый. Заголовок кодирует тариф+цену+валюту, поэтому при
 * смене цены создаётся новый план, а не переопределяется старый.
 */
export async function ensurePlan(
  config: BepaidConfig,
  input: PlanInput
): Promise<string> {
  const existing = await findPlanIdByTitle(config, input.title);
  if (existing) return existing;

  const res = await fetch(`${config.apiBaseUrl}/plans`, {
    method: "POST",
    headers: jsonHeaders(config),
    body: JSON.stringify({
      test: config.testMode,
      title: input.title,
      currency: input.currency,
      language: "ru",
      infinite: true,
      number_payment_attempts: input.numberPaymentAttempts ?? 3,
      plan: {
        amount: input.amountMinor,
        interval: input.interval,
        interval_unit: input.intervalUnit,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`bePaid create plan failed: ${String(res.status)} ${text}`);
  }
  const json = (await res.json()) as { id?: unknown };
  if (typeof json.id !== "string" || !json.id) {
    throw new Error("bePaid create plan: id не получен");
  }
  return json.id;
}

/**
 * Создаёт подписку bePaid по плану. Возвращает id (`sbs_…`) и `redirect_url`
 * (страница ввода карты). Бросает Error при не-2xx ответе.
 */
export async function createSubscription(
  config: BepaidConfig,
  input: SubscriptionInput
): Promise<SubscriptionResponse> {
  const res = await fetch(`${config.apiBaseUrl}/subscriptions`, {
    method: "POST",
    headers: jsonHeaders(config),
    body: JSON.stringify({
      plan: { id: input.planId },
      tracking_id: input.trackingId,
      notification_url: input.notifyUrl,
      return_url: input.returnUrl,
      settings: { language: "ru" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`bePaid create subscription failed: ${String(res.status)} ${text}`);
  }
  const json = (await res.json()) as {
    id?: unknown;
    state?: unknown;
    redirect_url?: unknown;
  };
  if (typeof json.id !== "string" || !json.id) {
    throw new Error("bePaid create subscription: id не получен");
  }
  return {
    id: json.id,
    state: typeof json.state === "string" ? json.state : "",
    redirectUrl: typeof json.redirect_url === "string" ? json.redirect_url : null,
  };
}

/**
 * Запрашивает статус подписки у bePaid по id (Basic Auth).
 * Источник истины для активации/отмены — тело webhook не доверяем.
 */
export async function getSubscription(
  config: BepaidConfig,
  id: string
): Promise<VerifiedSubscription | null> {
  const res = await fetch(
    `${config.apiBaseUrl}/subscriptions/${encodeURIComponent(id)}`,
    { method: "GET", headers: jsonHeaders(config) }
  );
  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json) return null;
  // Ответ может быть плоским или обёрнутым в { subscription: {...} }.
  const s =
    json.subscription && typeof json.subscription === "object"
      ? (json.subscription as Record<string, unknown>)
      : json;
  if (typeof s.state !== "string") return null;

  const plan =
    s.plan && typeof s.plan === "object" ? (s.plan as Record<string, unknown>) : null;
  const lastTx =
    s.last_transaction && typeof s.last_transaction === "object"
      ? (s.last_transaction as Record<string, unknown>)
      : null;
  const activeToRaw = s.active_to;
  return {
    id: typeof s.id === "string" ? s.id : id,
    state: s.state,
    trackingId: typeof s.tracking_id === "string" ? s.tracking_id : null,
    activeTo: typeof activeToRaw === "string" ? new Date(activeToRaw) : null,
    planId: plan && typeof plan.id === "string" ? plan.id : null,
    lastTransactionUid: lastTx && typeof lastTx.uid === "string" ? lastTx.uid : null,
  };
}

/**
 * Отменяет подписку bePaid (останавливает автопродление). Возвращает `true` при
 * успехе. Доступ у пользователя сохраняется до конца оплаченного периода.
 */
export async function cancelSubscription(
  config: BepaidConfig,
  id: string
): Promise<boolean> {
  const res = await fetch(
    `${config.apiBaseUrl}/subscriptions/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      headers: jsonHeaders(config),
      body: JSON.stringify({ cancel_reason: "Отменено пользователем" }),
    }
  );
  // 404 → подписки нет в этом магазине (например, осталась от тестового
  // окружения после перехода на боевые ключи) — автосписания и так нет,
  // считаем отмену успешной, чтобы не блокировать смену тарифа/отмену.
  if (res.status === 404) return true;
  return res.ok;
}
