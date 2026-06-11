import { describe, expect, it, vi } from "vitest";
import { WorkspaceApiService } from "./workspace-api.service";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

/**
 * Гейтинг фичи `collaborative` на стороне сервера: приглашение участника в общий
 * workspace должно блокироваться, если у тарифа пользователя нет фичи `collaborative`.
 */
function makeService(hasFeature: boolean) {
  const userService = { findByUsername: vi.fn(async () => null) };
  const workspaceService = {
    getWorkspaceForUser: vi.fn(async () => ({ id: 7 })),
    isWorkspaceOwner: vi.fn(async () => true),
  };
  const invitationRepo = { create: vi.fn() };
  const customCategoryService = {};
  const featureService = { hasFeature: vi.fn(async () => hasFeature) };
  const telegram = { sendMessage: vi.fn() };
  const svc = new WorkspaceApiService(
    userService as never,
    workspaceService as never,
    invitationRepo as never,
    customCategoryService as never,
    featureService as never,
    telegram as never
  );
  return { svc, userService, featureService };
}

const resolved = { userId: 1 } as ResolvedTelegramUser;

describe("WorkspaceApiService — гейтинг фичи collaborative", () => {
  it("блокирует приглашение без фичи collaborative (не доходит до поиска пользователя)", async () => {
    const { svc, userService, featureService } = makeService(false);

    const res = await svc.invite(resolved, "@friend");

    expect(res.error).toContain("Совместный учёт");
    expect(featureService.hasFeature).toHaveBeenCalledWith(1, "collaborative");
    expect(userService.findByUsername).not.toHaveBeenCalled();
  });

  it("с фичей collaborative проходит гейт и ищет приглашаемого пользователя", async () => {
    const { svc, userService } = makeService(true);

    const res = await svc.invite(resolved, "@friend");

    // Гейт пройден: получаем уже другую ошибку (пользователь не найден), а не запрет тарифа.
    expect(res.error).not.toContain("Совместный учёт");
    expect(userService.findByUsername).toHaveBeenCalledWith("friend");
  });
});
