import { afterEach, describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { createVoiceHandler } from "./voice-handler";
import type { BotDeps } from "../bot";

/**
 * Гейтинг фичи `voice_input` на стороне бота: голосовое сообщение не должно
 * распознаваться, если у тарифа пользователя нет фичи `voice_input`.
 * Это ключевой пример «обрезания фич на сервере».
 */
function makeDeps(hasFeature: boolean) {
  const recognizeVoice = vi.fn(async () => "кофе 8.50");
  const deps = {
    userService: {
      findOrCreate: vi.fn(async () => ({ id: 1, telegramId: 555 })),
      getDefaultCurrency: vi.fn(async () => "USD"),
    },
    workspaceService: { getWorkspaceForUser: vi.fn(async () => null) },
    customCategoryService: { getCategoriesPlain: vi.fn(async () => []) },
    featureService: { hasFeature: vi.fn(async () => hasFeature) },
    expenseService: { recognizeVoice },
  } as unknown as BotDeps;
  return { deps, recognizeVoice };
}

function makeCtx() {
  const reply = vi.fn(async () => undefined);
  const ctx = {
    reply,
    from: { id: 555, username: "vasya" },
    message: { voice: { file_id: "f1", mime_type: "audio/ogg" } },
    api: {
      token: "t",
      getFile: vi.fn(async () => ({ file_path: "voice/f1.ogg" })),
    },
  } as unknown as Context;
  return { ctx, reply };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("voice-handler — гейтинг фичи voice_input", () => {
  it("без фичи voice_input отвечает апселлом и не распознаёт голос", async () => {
    const { deps, recognizeVoice } = makeDeps(false);
    const { ctx, reply } = makeCtx();

    await createVoiceHandler(deps)(ctx);

    expect(deps.featureService.hasFeature).toHaveBeenCalledWith(1, "voice_input");
    expect(recognizeVoice).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.stringContaining("Голосовой ввод"));
  });

  it("с фичей voice_input доходит до распознавания голоса", async () => {
    const { deps, recognizeVoice } = makeDeps(true);
    const { ctx } = makeCtx();
    // Голосовой файл скачивается через fetch до распознавания — мокаем успешную загрузку.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))
    );
    // Дальнейший парсинг текста нас не интересует (и падает на мок-зависимостях) — глушим лог.
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await createVoiceHandler(deps)(ctx);

    expect(recognizeVoice).toHaveBeenCalledTimes(1);
  });
});
