/**
 * Клиент платёжного провайдера bePaid (https://docs.bepaid.by).
 *
 * Используется два эндпоинта:
 * - `POST {checkoutBaseUrl}/ctp/api/checkouts` — создаёт checkout-токен для виджета оплаты.
 * - `GET {gatewayBaseUrl}/transactions/{uid}` — статус транзакции для верификации webhook
 *   (тело webhook не доверяем — статус подтверждаем повторным запросом к bePaid).
 *
 * Аутентификация — HTTP Basic (shop_id:secret_key).
 */

/** Конфигурация магазина bePaid + сервисные URL. */
export interface BepaidConfig {
  shopId: string;
  secretKey: string;
  /** База checkout-API (создание токена виджета). По умолчанию https://checkout.bepaid.by */
  checkoutBaseUrl: string;
  /** База gateway-API (проверка статуса транзакции). По умолчанию https://gateway.bepaid.by */
  gatewayBaseUrl: string;
  /** Тестовый режим bePaid (checkout.test=true) — деньги не списываются. */
  testMode: boolean;
  /** Валюта платежа (тарифы в Strapi указаны в BYN). */
  currency: string;
}

/** Данные одного платежа для создания checkout. */
export interface CheckoutInput {
  /** Номер заказа `<userId>-<code>-<ts>` — кладётся в order.tracking_id. */
  trackingId: string;
  /** Сумма в минимальных единицах валюты (BYN*100, целое). */
  amountMinor: number;
  description: string;
  returnUrl: string;
  notifyUrl: string;
}

/** Результат создания checkout. */
export interface CheckoutResponse {
  token: string;
  /** Резервная ссылка на hosted-страницу (на случай fallback без виджета). */
  redirectUrl: string | null;
}

/** Нормализованный статус транзакции для верификации webhook. */
export interface TransactionStatus {
  uid: string;
  status: string;
  trackingId: string | null;
}

function authHeader(config: BepaidConfig): string {
  const raw = `${config.shopId}:${config.secretKey}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

/**
 * Создаёт checkout-токен bePaid для виджета оплаты.
 * Бросает Error при не-2xx ответе или отсутствии токена.
 */
export async function createCheckout(
  config: BepaidConfig,
  input: CheckoutInput
): Promise<CheckoutResponse> {
  const res = await fetch(`${config.checkoutBaseUrl}/ctp/api/checkouts`, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Version": "2",
    },
    body: JSON.stringify({
      checkout: {
        test: config.testMode,
        transaction_type: "payment",
        settings: {
          return_url: input.returnUrl,
          notification_url: input.notifyUrl,
          language: "ru",
        },
        order: {
          amount: input.amountMinor,
          currency: config.currency,
          description: input.description,
          tracking_id: input.trackingId,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`bePaid checkout failed: ${String(res.status)} ${text}`);
  }

  const json = (await res.json()) as {
    checkout?: { token?: unknown; redirect_url?: unknown };
  };
  const token = json.checkout?.token;
  if (typeof token !== "string" || !token) {
    throw new Error("bePaid checkout: токен не получен");
  }
  const redirectUrl = json.checkout?.redirect_url;
  return {
    token,
    redirectUrl: typeof redirectUrl === "string" ? redirectUrl : null,
  };
}

/**
 * Запрашивает статус транзакции у bePaid по uid (Basic Auth).
 * Источник истины для активации подписки — тело webhook не доверяем.
 */
export async function getTransactionStatus(
  config: BepaidConfig,
  uid: string
): Promise<TransactionStatus | null> {
  const res = await fetch(
    `${config.gatewayBaseUrl}/transactions/${encodeURIComponent(uid)}`,
    {
      method: "GET",
      headers: {
        Authorization: authHeader(config),
        Accept: "application/json",
        "X-API-Version": "2",
      },
    }
  );

  if (!res.ok) return null;

  const json = (await res.json()) as {
    transaction?: { uid?: unknown; status?: unknown; tracking_id?: unknown };
  };
  const tx = json.transaction;
  if (!tx || typeof tx.status !== "string") return null;
  return {
    uid: typeof tx.uid === "string" ? tx.uid : uid,
    status: tx.status,
    trackingId: typeof tx.tracking_id === "string" ? tx.tracking_id : null,
  };
}
