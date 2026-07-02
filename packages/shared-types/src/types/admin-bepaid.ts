/** Одна подписка bePaid для админ-панели (обогащённая локальным пользователем). */
export interface AdminBepaidSubscription {
  /** Идентификатор подписки bePaid (`sbs_…`). */
  id: string;
  /** Состояние подписки bePaid (`active` | `canceled` | `failed` | …). */
  state: string;
  /** Локальный userId, восстановленный из tracking_id (если удалось). */
  userId: number | null;
  /** Отображаемое имя пользователя (@username / «Пользователь N»). */
  displayName: string | null;
  /** Идентификатор плана bePaid (`pln_…`). */
  planId: string | null;
  /** Заголовок плана bePaid. */
  planTitle: string | null;
  /** Сумма списания в основной единице валюты (например BYN). */
  amount: number | null;
  currency: string | null;
  /** Последние 4 цифры карты. */
  cardLast4: string | null;
  /** Статус последней транзакции списания. */
  lastTransactionStatus: string | null;
  /** Дата создания подписки (ISO-строка). */
  createdAt: string | null;
  /** Срок действия оплаченного периода (ISO-строка). */
  activeTo: string | null;
}

/** Ответ админ-эндпоинта со списком подписок bePaid. */
export interface AdminBepaidSubscriptionsResponse {
  /** Активный платёжный шлюз. При `test` реальных подписок bePaid нет. */
  gateway: "bepaid" | "test";
  /** Тестовый режим bePaid (подписки помечены `test=true`). */
  testMode: boolean;
  subscriptions: AdminBepaidSubscription[];
  error?: string;
}
