import type { ContactsInfo } from "@finance-bot/shared";

/**
 * Read-only чтение контактов из Strapi site-setting (источник истины — тот же
 * single type, что и на лендинге /contacts). Если Strapi недоступен и кэша ещё
 * нет — возвращает `null` (страница «Контакты» покажет сообщение об ошибке).
 */

/** Strapi v5 отдаёт single type плоско, v4 — через `{ attributes }`. */
function unwrap(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && "attributes" in value) {
    return (value as { attributes: Record<string, unknown> }).attributes;
  }
  return (value as Record<string, unknown>) ?? {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export class StrapiSiteSettings {
  private cache: ContactsInfo | null = null;
  private fetchedAt = 0;
  private readonly ttlMs = 60_000;

  constructor(private readonly strapiApiUrl: string) {}

  /** Контакты из site-setting. `null` — конфиг недоступен (Strapi недоступен и нет кэша). */
  async getContacts(): Promise<ContactsInfo | null> {
    const now = Date.now();
    if (this.cache && now - this.fetchedAt < this.ttlMs) return this.cache;
    try {
      const contacts = await this.fetchContacts();
      this.cache = contacts;
      this.fetchedAt = now;
      return contacts;
    } catch {
      // Возвращаем последний удачный кэш, если он есть; иначе null (деградация).
      return this.cache;
    }
  }

  private async fetchContacts(): Promise<ContactsInfo> {
    const res = await fetch(`${this.strapiApiUrl}/api/site-setting`);
    if (!res.ok) throw new Error(`Strapi site-setting ${String(res.status)}`);
    const json = (await res.json()) as { data?: unknown };
    const attrs = unwrap(json.data);
    return {
      email: stringOrNull(attrs["email"]),
      telegramSupport: stringOrNull(attrs["telegramSupport"])?.replace(/^@/, "") ?? null,
    };
  }
}
