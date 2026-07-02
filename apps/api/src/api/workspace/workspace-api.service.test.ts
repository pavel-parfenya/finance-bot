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

/** info(): флаг collaborativeLocked = участников >1 И у владельца нет фичи collaborative. */
function makeInfoService(opts: { memberCount: number; ownerHasCollab: boolean }) {
  const members = Array.from({ length: opts.memberCount }, (_, i) => ({
    userId: i + 1,
    username: `u${i + 1}`,
    role: i === 0 ? "owner" : "member",
    fullAccess: true,
  }));
  const userService = { getInfoChangelogSeenVersion: vi.fn(async () => 0) };
  const workspaceService = {
    getWorkspaceForUser: vi.fn(async () => ({ id: 7, ownerId: 1 })),
    isWorkspaceOwner: vi.fn(async () => true),
    getWorkspaceMembers: vi.fn(async () => members),
  };
  const featureService = { hasFeature: vi.fn(async () => opts.ownerHasCollab) };
  const svc = new WorkspaceApiService(
    userService as never,
    workspaceService as never,
    {} as never,
    {} as never,
    featureService as never,
    {} as never
  );
  return { svc, featureService };
}

describe("WorkspaceApiService.info — collaborativeLocked", () => {
  it("locked=true: участников больше одного и у владельца нет collaborative", async () => {
    const { svc, featureService } = makeInfoService({
      memberCount: 2,
      ownerHasCollab: false,
    });

    const res = await svc.info(resolved);

    expect(res.collaborativeLocked).toBe(true);
    expect(featureService.hasFeature).toHaveBeenCalledWith(1, "collaborative");
  });

  it("locked=false: у владельца есть collaborative", async () => {
    const { svc } = makeInfoService({ memberCount: 2, ownerHasCollab: true });

    const res = await svc.info(resolved);

    expect(res.collaborativeLocked).toBe(false);
  });

  it("locked=false: solo-пространство (один участник) не ограничиваем", async () => {
    const { svc, featureService } = makeInfoService({
      memberCount: 1,
      ownerHasCollab: false,
    });

    const res = await svc.info(resolved);

    expect(res.collaborativeLocked).toBe(false);
    // При одном участнике фичу вообще не спрашиваем (short-circuit).
    expect(featureService.hasFeature).not.toHaveBeenCalled();
  });
});
