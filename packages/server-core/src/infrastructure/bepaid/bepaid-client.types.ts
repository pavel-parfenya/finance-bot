/** Конфигурация магазина bePaid + сервисные URL. */
export interface BepaidConfig {
  shopId: string;
  secretKey: string;
  /** База API подписок и планов. По умолчанию https://api.bepaid.by */
  apiBaseUrl: string;
  /** Тестовый режим bePaid (test=true) — деньги не списываются. */
  testMode: boolean;
  /** Валюта платежа (тарифы в Strapi указаны в BYN). */
  currency: string;
}

/** Параметры плана подписки. */
export interface PlanInput {
  /** Уникальный заголовок плана (кодирует тариф+цену+валюту — для поиска/идемпотентности). */
  title: string;
  /** Сумма списания в минимальных единицах валюты (BYN*100, целое). */
  amountMinor: number;
  currency: string;
  /** Интервал списания: число + единица (`day` | `month`). Год = 12 month. */
  interval: number;
  intervalUnit: "day" | "month";
  /** Кол-во попыток списания при ошибке (по умолчанию 3). */
  numberPaymentAttempts?: number;
}

/** Параметры создания подписки. */
export interface SubscriptionInput {
  /** Идентификатор плана bePaid (`pln_…`). */
  planId: string;
  /** Номер заказа `<userId>-<code>` — для сопоставления webhook с пользователем. */
  trackingId: string;
  /** Server-to-server notify (продления/отмены). */
  notifyUrl: string;
  /** Возврат пользователя после ввода карты. */
  returnUrl: string;
}

/** Результат создания подписки. */
export interface SubscriptionResponse {
  /** Идентификатор подписки (`sbs_…`). */
  id: string;
  /** Состояние подписки (`redirecting` сразу после создания). */
  state: string;
  /** Ссылка на страницу ввода карты — её отдаём на фронт. */
  redirectUrl: string | null;
}

/** Нормализованный статус подписки для верификации webhook. */
export interface VerifiedSubscription {
  id: string;
  state: string;
  trackingId: string | null;
  /** Срок действия оплаченного периода (источник истины для нашего expiresAt). */
  activeTo: Date | null;
  planId: string | null;
  /** uid последней транзакции списания. */
  lastTransactionUid: string | null;
}
