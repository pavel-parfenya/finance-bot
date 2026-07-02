import { describe, expect, it, vi } from "vitest";
import { TelegramAuthService } from "./telegram-auth.service";
import type { ResolvedTelegramUser } from "./telegram-auth.types";

/**
 * «Сплит» совместного учёта: workspace попадает в fullAccessWorkspaceIds только
 * если у пользователя есть хранимый доступ И (участников <=1 ИЛИ у владельца
 * пространства есть фича collaborative). Иначе каждый видит лишь свои записи.
 */
function makeService(opts: {
  workspaceIds: number[];
  meta: Record<number, { ownerId: number; memberCount: number }>;
  memberFullAccess?: Record<number, boolean>;
  hasCollaborative?: boolean;
}) {
  const userService = {
    findOneByTelegramId: vi.fn(async () => ({ id: 42, username: "tester" })),
  };
  const workspaceService = {
    getWorkspaceIdsForUser: vi.fn(async () => opts.workspaceIds),
    getCollaborationMeta: vi.fn(
      async () => new Map(Object.entries(opts.meta).map(([k, v]) => [Number(k), v]))
    ),
    getMemberFullAccess: vi.fn(
      async (wid: number) => opts.memberFullAccess?.[wid] ?? true
    ),
  };
  const featureService = {
    hasFeature: vi.fn(async () => opts.hasCollaborative ?? false),
  };
  const appConfig = { isTestApiAuth: true, testTelegramUserId: 999 };
  const svc = new TelegramAuthService(
    userService as never,
    workspaceService as never,
    featureService as never,
    appConfig as never,
    "bot-token"
  );
  return { svc, featureService };
}

async function resolve(svc: TelegramAuthService) {
  return (await svc.resolveFromInitData("")) as ResolvedTelegramUser;
}

describe("TelegramAuthService — сплит совместного учёта", () => {
  it("многопользовательский workspace без collaborative у владельца → нет полного доступа", async () => {
    const { svc, featureService } = makeService({
      workspaceIds: [7],
      meta: { 7: { ownerId: 1, memberCount: 2 } },
      hasCollaborative: false,
    });

    const res = await resolve(svc);

    expect(res.workspaceIds).toEqual([7]);
    expect(res.fullAccessWorkspaceIds).toEqual([]);
    expect(featureService.hasFeature).toHaveBeenCalledWith(1, "collaborative");
  });

  it("многопользовательский workspace с collaborative у владельца → полный доступ", async () => {
    const { svc } = makeService({
      workspaceIds: [7],
      meta: { 7: { ownerId: 1, memberCount: 2 } },
      hasCollaborative: true,
    });

    const res = await resolve(svc);

    expect(res.fullAccessWorkspaceIds).toEqual([7]);
  });

  it("solo-workspace (один участник) не ограничиваем даже без collaborative", async () => {
    const { svc, featureService } = makeService({
      workspaceIds: [7],
      meta: { 7: { ownerId: 42, memberCount: 1 } },
      hasCollaborative: false,
    });

    const res = await resolve(svc);

    expect(res.fullAccessWorkspaceIds).toEqual([7]);
    expect(featureService.hasFeature).not.toHaveBeenCalled();
  });

  it("хранимый fullAccess=false исключает workspace независимо от фичи", async () => {
    const { svc } = makeService({
      workspaceIds: [7],
      meta: { 7: { ownerId: 1, memberCount: 2 } },
      memberFullAccess: { 7: false },
      hasCollaborative: true,
    });

    const res = await resolve(svc);

    expect(res.fullAccessWorkspaceIds).toEqual([]);
  });
});
