export interface MetaCapiConfig {
  /** ID набора данных (пикселя) Meta. */
  pixelId: string;
  /** Токен Conversions API (Events Manager → Настройки → Conversions API). Пусто — сервис выключен. */
  accessToken: string;
  /** event_source_url для событий с action_source=website (страница выбора тарифа). */
  eventSourceUrl: string;
  /** Код вкладки «Тестирование событий» — события уходят в тест, а не в прод-статистику. */
  testEventCode: string | null;
}

/** Данные браузера покупателя, прокинутые с лендинга через POST /api/billing/checkout. */
export interface MetaCapiClientContext {
  /** event_id браузерного события — Meta дедуплицирует пары Pixel+CAPI по нему. */
  eventId?: string;
  /** Cookie `_fbp` (browser id Meta). */
  fbp?: string;
  /** Cookie `_fbc` (click id рекламной кампании). */
  fbc?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
}

export interface MetaCapiInitiateCheckoutInput {
  userId: number;
  /** Тариф (`pro_month`/`pro_year`) — уходит в content_name. */
  plan: string;
  value: number;
  currency: string;
  client?: MetaCapiClientContext;
}

export interface MetaCapiPurchaseInput {
  userId: number;
  plan: string;
  value: number;
  currency: string;
  /** Уникален на списание (uid транзакции bePaid) — гасит дубли от ретраев webhook. */
  eventId: string;
}

/**
 * Просмотр страницы лендинга. Без `userId` — на этом этапе посетитель обычно
 * анонимен (заходит до логина/оплаты), матчинг только по fbp/fbc/ip/UA.
 */
export interface MetaCapiPageViewInput {
  /** URL просмотренной страницы (`event_source_url`). */
  url: string;
  client: MetaCapiClientContext;
}

/** Событие Graph API `POST /{pixel_id}/events` (поля по спецификации CAPI). */
export interface MetaCapiEvent {
  event_name: "PageView" | "InitiateCheckout" | "Purchase";
  event_time: number;
  event_id?: string;
  action_source: "website" | "system_generated";
  event_source_url?: string;
  user_data: {
    /** Есть только у авторизованных событий (InitiateCheckout/Purchase) — PageView анонимен. */
    external_id?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbp?: string;
    fbc?: string;
  };
  /** Отсутствует у PageView — value/currency есть только у событий с суммой оплаты. */
  custom_data?: {
    value: number;
    currency: string;
    content_name?: string;
  };
}
