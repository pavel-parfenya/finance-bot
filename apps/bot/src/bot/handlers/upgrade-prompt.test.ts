import { describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { replyFeatureGated } from "./upgrade-prompt";
import type { BotDeps } from "../bot";

type WebAppButton = { text: string; web_app?: { url: string }; url?: string };
type ReplyExtra = { reply_markup: { inline_keyboard: WebAppButton[][] } };

function makeDeps(opts: { configured: boolean; landingBaseUrl: string }): BotDeps {
  return {
    billingTokenService: {
      isConfigured: opts.configured,
      sign: vi.fn(() => "jwt-token"),
    },
    landingBaseUrl: opts.landingBaseUrl,
  } as unknown as BotDeps;
}

function makeCtx() {
  const reply = vi.fn<(text: string, extra?: ReplyExtra) => Promise<void>>(
    async () => undefined
  );
  return { ctx: { reply } as unknown as Context, reply };
}

describe("replyFeatureGated — кнопка «Сменить план»", () => {
  it("при настроенном billing и HTTPS-лендинге шлёт url-кнопку на /subscribe", async () => {
    const deps = makeDeps({ configured: true, landingBaseUrl: "https://finance-bot.by" });
    const { ctx, reply } = makeCtx();

    await replyFeatureGated(ctx, deps, 555, "🎙 Голос на платном тарифе.");

    expect(deps.billingTokenService.sign).toHaveBeenCalledWith(555);
    const [text, extra] = reply.mock.calls[0];
    expect(text).toContain("Голос");
    const button = extra?.reply_markup.inline_keyboard[0]?.[0];
    expect(button?.text).toContain("Сменить план");
    // Открывает страницу сайта напрямую (url), а не как mini-app/WebView (web_app).
    expect(button?.url).toBe("https://finance-bot.by/subscribe?token=jwt-token");
    expect(button?.web_app).toBeUndefined();
  });

  it("без настроенного billing шлёт текстовый фолбэк про Mini App без кнопки", async () => {
    const deps = makeDeps({
      configured: false,
      landingBaseUrl: "https://finance-bot.by",
    });
    const { ctx, reply } = makeCtx();

    await replyFeatureGated(ctx, deps, 555, "💸 Долги на платном тарифе.");

    const [text, extra] = reply.mock.calls[0];
    expect(text).toContain("Mini App");
    expect(extra).toBeUndefined();
  });

  it("не строит кнопку при не-HTTPS лендинге (Telegram требует HTTPS)", async () => {
    const deps = makeDeps({ configured: true, landingBaseUrl: "http://localhost:3001" });
    const { ctx, reply } = makeCtx();

    await replyFeatureGated(ctx, deps, 555, "🎙 Голос.");

    const [, extra] = reply.mock.calls[0];
    expect(extra).toBeUndefined();
  });
});
