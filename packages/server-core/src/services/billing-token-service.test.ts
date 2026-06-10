import { describe, it, expect } from "vitest";
import { BillingTokenService } from "./billing-token-service";

describe("BillingTokenService", () => {
  const svc = new BillingTokenService("test-secret-0123456789");

  it("round-trips telegramId через подпись/проверку", () => {
    const token = svc.sign(42);
    expect(svc.verify(token)).toEqual({ telegramId: 42 });
  });

  it("отклоняет токен, подписанный другим секретом", () => {
    const other = new BillingTokenService("another-secret");
    const token = other.sign(42);
    expect(svc.verify(token)).toBeNull();
  });

  it("возвращает null на мусорный токен", () => {
    expect(svc.verify("not-a-jwt")).toBeNull();
    expect(svc.verify("")).toBeNull();
  });

  it("без секрета не настроен и не подписывает", () => {
    const empty = new BillingTokenService("");
    expect(empty.isConfigured).toBe(false);
    expect(() => empty.sign(1)).toThrow();
    expect(empty.verify("anything")).toBeNull();
  });

  it("истёкший токен не проходит проверку", () => {
    const shortLived = new BillingTokenService("test-secret-0123456789", "-1s");
    const token = shortLived.sign(7);
    expect(shortLived.verify(token)).toBeNull();
  });
});
