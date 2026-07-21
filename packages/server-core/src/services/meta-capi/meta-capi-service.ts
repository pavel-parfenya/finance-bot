import type {
  MetaCapiClientContext,
  MetaCapiConfig,
  MetaCapiEvent,
  MetaCapiInitiateCheckoutInput,
  MetaCapiPurchaseInput,
  MetaCapiSubscribeInput,
} from "./meta-capi-service.types";
import { buildEvent } from "./meta-capi-service.utils";

export type { MetaCapiClientContext, MetaCapiConfig } from "./meta-capi-service.types";

const GRAPH_API_URL = "https://graph.facebook.com/v22.0";

/**
 * Контекст браузера (fbp/fbc/ip/UA), запомненный на checkout, переиспользуется
 * для Purchase/Subscribe из webhook — первая оплата приходит через минуты после
 * checkout, и событие уходит с полным матчингом. Продления спустя месяцы
 * контекста не имеют и уходят как system_generated.
 */
const CLIENT_CONTEXT_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * Meta Conversions API: server-side события для рекламной атрибуции —
 * InitiateCheckout (клик «выбрать тариф»), Purchase и Subscribe (подтверждённая
 * оплата, bePaid webhook). Все отправки best-effort — ошибка логируется и
 * никогда не прерывает оплату. Без токена (`META_CAPI_ACCESS_TOKEN`) сервис
 * молча выключен.
 */
export class MetaCapiService {
  private readonly clientContexts = new Map<
    number,
    { ctx: MetaCapiClientContext; at: number }
  >();

  constructor(private readonly cfg: MetaCapiConfig) {}

  get enabled(): boolean {
    return Boolean(this.cfg.pixelId && this.cfg.accessToken);
  }

  /** Клик «выбрать тариф» → создание checkout-сессии. Дедуп с браузерным событием по event_id. */
  async initiateCheckout(input: MetaCapiInitiateCheckoutInput): Promise<void> {
    if (input.client) {
      this.clientContexts.set(input.userId, { ctx: input.client, at: Date.now() });
    }
    await this.send(
      buildEvent({
        eventName: "InitiateCheckout",
        userId: input.userId,
        eventId: input.client?.eventId,
        eventSourceUrl: this.cfg.eventSourceUrl,
        client: input.client,
        value: input.value,
        currency: input.currency,
        contentName: input.plan,
      })
    );
  }

  /** Подтверждённая оплата (bePaid webhook): первая покупка или продление. */
  async purchase(input: MetaCapiPurchaseInput): Promise<void> {
    await this.send(
      buildEvent({
        eventName: "Purchase",
        userId: input.userId,
        eventId: input.eventId,
        eventSourceUrl: this.cfg.eventSourceUrl,
        // eventId у браузерного InitiateCheckout свой — на Purchase переносим
        // только идентификаторы матчинга (fbp/fbc/ip/UA), не event_id клика.
        client: this.matchingClient(input.userId),
        value: input.value,
        currency: input.currency,
        contentName: input.plan,
      })
    );
  }

  /** Подтверждённая оплата (bePaid webhook): дублирует Purchase под именем Subscribe. */
  async subscribe(input: MetaCapiSubscribeInput): Promise<void> {
    await this.send(
      buildEvent({
        eventName: "Subscribe",
        userId: input.userId,
        eventId: input.eventId,
        eventSourceUrl: this.cfg.eventSourceUrl,
        client: this.matchingClient(input.userId),
        value: input.value,
        currency: input.currency,
        contentName: input.plan,
      })
    );
  }

  /** fbp/fbc/ip/UA, запомненные на checkout (если не протухли), без event_id клика. */
  private matchingClient(userId: number): MetaCapiClientContext | undefined {
    const stored = this.clientContexts.get(userId);
    if (!stored || Date.now() - stored.at >= CLIENT_CONTEXT_TTL_MS) return undefined;
    return { ...stored.ctx, eventId: undefined };
  }

  private async send(event: MetaCapiEvent): Promise<void> {
    if (!this.enabled) return;
    try {
      const res = await fetch(`${GRAPH_API_URL}/${this.cfg.pixelId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [event],
          access_token: this.cfg.accessToken,
          ...(this.cfg.testEventCode ? { test_event_code: this.cfg.testEventCode } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(
          `[meta-capi] ${event.event_name} отклонён (${res.status}): ${body.slice(0, 500)}`
        );
      }
    } catch (e) {
      console.error(`[meta-capi] не удалось отправить ${event.event_name}:`, e);
    }
  }
}
