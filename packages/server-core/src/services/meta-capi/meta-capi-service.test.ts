import { describe, expect, it } from "vitest";
import { buildEvent, sha256 } from "./meta-capi-service.utils";

describe("sha256", () => {
  it("нормализует значение (trim + lowercase) перед хэшированием", () => {
    expect(sha256("  42 ")).toBe(sha256("42"));
    expect(sha256("ABC")).toBe(sha256("abc"));
    expect(sha256("42")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildEvent", () => {
  const base = {
    eventName: "InitiateCheckout" as const,
    userId: 42,
    eventSourceUrl: "https://l/subscribe",
    value: 9.9,
    currency: "BYN",
    contentName: "pro_month",
  };

  it("с данными браузера — website-событие с полным user_data", () => {
    const event = buildEvent({
      ...base,
      eventId: "evt-1",
      client: {
        eventId: "evt-1",
        fbp: "fb.1.1.2",
        fbc: "fb.1.1.click",
        clientIpAddress: "1.2.3.4",
        clientUserAgent: "Mozilla/5.0",
      },
    });
    expect(event.action_source).toBe("website");
    expect(event.event_source_url).toBe("https://l/subscribe");
    expect(event.event_id).toBe("evt-1");
    expect(event.user_data).toEqual({
      external_id: [sha256("42")],
      client_ip_address: "1.2.3.4",
      client_user_agent: "Mozilla/5.0",
      fbp: "fb.1.1.2",
      fbc: "fb.1.1.click",
    });
    expect(event.custom_data).toEqual({
      value: 9.9,
      currency: "BYN",
      content_name: "pro_month",
    });
  });

  it("без user-agent — system_generated (website без UA отклоняется Graph API)", () => {
    const event = buildEvent({ ...base, eventName: "Purchase", eventId: "trx-1" });
    expect(event.action_source).toBe("system_generated");
    expect(event.event_source_url).toBeUndefined();
    expect(event.user_data).toEqual({ external_id: [sha256("42")] });
  });

  it("PageView — без userId и value: нет external_id и custom_data", () => {
    const event = buildEvent({
      eventName: "PageView",
      eventSourceUrl: "https://l/pricing",
      eventId: "pv-1",
      client: { clientUserAgent: "Mozilla/5.0", fbp: "fb.1.1.2" },
    });
    expect(event.action_source).toBe("website");
    expect(event.event_source_url).toBe("https://l/pricing");
    expect(event.user_data).toEqual({
      client_user_agent: "Mozilla/5.0",
      fbp: "fb.1.1.2",
    });
    expect(event.custom_data).toBeUndefined();
  });
});
