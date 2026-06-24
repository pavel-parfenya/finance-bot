import { describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { replyFeatureGated } from "./upgrade-prompt";
import type { BotDeps } from "../bot";

type WebAppButton = { text: string; web_app?: { url: string }; url?: string };
type ReplyExtra = { reply_markup: { inline_keyboard: WebAppButton[][] } };

function makeDeps(opts: { miniAppUrl: string }): BotDeps {
  return {
    miniAppUrl: opts.miniAppUrl,
  } as unknown as BotDeps;
}

function makeCtx() {
  const reply = vi.fn<(text: string, extra?: ReplyExtra) => Promise<void>>(
    async () => undefined
  );
  return { ctx: { reply } as unknown as Context, reply };
}

describe("replyFeatureGated — кнопка «Сменить план»", () => {
  it("при HTTPS Mini App шлёт web_app-кнопку на страницу подписки Mini App", async () => {
    const deps = makeDeps({ miniAppUrl: "https://finance-bot.by/app" });
    const { ctx, reply } = makeCtx();

    await replyFeatureGated(ctx, deps, 555, "🎙 Голос на платном тарифе.");

    const [text, extra] = reply.mock.calls[0];
    expect(text).toContain("Голос");
    const button = extra?.reply_markup.inline_keyboard[0]?.[0];
    expect(button?.text).toContain("Сменить план");
    // Открывает Mini App (web_app/WebView) на странице настроек подписки, а не url.
    expect(button?.web_app?.url).toBe("https://finance-bot.by/settings/subscription");
    expect(button?.url).toBeUndefined();
  });

  it("не строит кнопку при не-HTTPS Mini App (Telegram требует HTTPS)", async () => {
    const deps = makeDeps({ miniAppUrl: "http://localhost:10000/app" });
    const { ctx, reply } = makeCtx();

    await replyFeatureGated(ctx, deps, 555, "🎙 Голос.");

    const [text, extra] = reply.mock.calls[0];
    expect(text).toContain("Mini App");
    expect(extra).toBeUndefined();
  });

  it("при отсутствии Mini App URL шлёт текстовый фолбэк про Mini App без кнопки", async () => {
    const deps = makeDeps({ miniAppUrl: "" });
    const { ctx, reply } = makeCtx();

    await replyFeatureGated(ctx, deps, 555, "💸 Долги на платном тарифе.");

    const [text, extra] = reply.mock.calls[0];
    expect(text).toContain("Mini App");
    expect(extra).toBeUndefined();
  });
});
