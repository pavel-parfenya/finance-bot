import { describe, expect, it } from "vitest";
import { buildAccess } from "./workspace-access";

describe("buildAccess", () => {
  it("returns undefined when user has full access to all workspaces", () => {
    expect(buildAccess([1, 2], [1, 2], 99)).toBeUndefined();
  });

  it("returns restriction when full access is a strict subset", () => {
    expect(buildAccess([1, 2, 3], [1], 42)).toEqual({
      fullAccessWorkspaceIds: [1],
      restrictToUserId: 42,
    });
  });
});
