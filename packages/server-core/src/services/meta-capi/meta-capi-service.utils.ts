import { createHash } from "node:crypto";
import type { MetaCapiClientContext, MetaCapiEvent } from "./meta-capi-service.types";

/** SHA-256 в hex (нормализация по требованиям Meta: trim + lowercase). */
export function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export interface BuildEventInput {
  eventName: MetaCapiEvent["event_name"];
  /** Нет у PageView — посетитель на этом этапе обычно анонимен. */
  userId?: number;
  eventId?: string;
  eventSourceUrl: string;
  client?: MetaCapiClientContext;
  /** Нет у PageView — событие без суммы оплаты. */
  value?: number;
  currency?: string;
  contentName?: string;
}

/**
 * Собирает событие CAPI. `action_source=website` требует client_user_agent —
 * без данных браузера (продление по webhook спустя месяцы) событие уходит как
 * `system_generated`, иначе Graph API отклонит его с ошибкой валидации.
 */
export function buildEvent(input: BuildEventInput): MetaCapiEvent {
  const { client } = input;
  const website = Boolean(client?.clientUserAgent);
  return {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    ...(input.eventId ? { event_id: input.eventId } : {}),
    action_source: website ? "website" : "system_generated",
    ...(website ? { event_source_url: input.eventSourceUrl } : {}),
    user_data: {
      // Внутренний id пользователя: Meta матчит его с external_id других событий.
      ...(input.userId !== undefined
        ? { external_id: [sha256(String(input.userId))] }
        : {}),
      ...(client?.clientIpAddress ? { client_ip_address: client.clientIpAddress } : {}),
      ...(client?.clientUserAgent ? { client_user_agent: client.clientUserAgent } : {}),
      ...(client?.fbp ? { fbp: client.fbp } : {}),
      ...(client?.fbc ? { fbc: client.fbc } : {}),
    },
    ...(input.value !== undefined
      ? {
          custom_data: {
            value: input.value,
            currency: input.currency ?? "",
            ...(input.contentName ? { content_name: input.contentName } : {}),
          },
        }
      : {}),
  };
}
