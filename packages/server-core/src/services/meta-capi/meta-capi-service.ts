import type {
  MetaCapiClientContext,
  MetaCapiConfig,
  MetaCapiEvent,
  MetaCapiSubscribeInput,
} from "./meta-capi-service.types";
import { buildEvent } from "./meta-capi-service.utils";

export type { MetaCapiClientContext, MetaCapiConfig } from "./meta-capi-service.types";

const GRAPH_API_URL = "https://graph.facebook.com/v22.0";

/**
 * Контекст браузера (fbp/fbc/ip/UA), запомненный на checkout, переиспользуется
 * для Subscribe из webhook — первая оплата приходит через минуты после checkout,
 * и событие уходит с полным матчингом. Продления спустя месяцы контекста не
 * имеют и уходят как system_generated.
 */
const CLIENT_CONTEXT_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * Meta Conversions API: единственное отправляемое событие — `Subscribe` на
 * подтверждённую оплату подписки (bePaid webhook), любой тариф, включая продления.
 * Отправка best-effort — ошибка логируется и никогда не прерывает оплату.
 * Без токена (`META_CAPI_ACCESS_TOKEN`) сервис молча выключен.
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

  /** Запоминает fbp/fbc/IP/UA браузера на момент checkout — для матчинга Subscribe из webhook. */
  rememberCheckoutContext(userId: number, client?: MetaCapiClientContext): void {
    if (client) {
      this.clientContexts.set(userId, { ctx: client, at: Date.now() });
    }
  }

  /** Подтверждённая оплата (bePaid webhook): первая покупка или продление любого тарифа. */
  async subscribe(input: MetaCapiSubscribeInput): Promise<void> {
    const stored = this.clientContexts.get(input.userId);
    const client =
      stored && Date.now() - stored.at < CLIENT_CONTEXT_TTL_MS ? stored.ctx : undefined;
    await this.send(
      buildEvent({
        eventName: "Subscribe",
        userId: input.userId,
        eventId: input.eventId,
        eventSourceUrl: this.cfg.eventSourceUrl,
        client,
        value: input.value,
        currency: input.currency,
        contentName: input.plan,
      })
    );
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
