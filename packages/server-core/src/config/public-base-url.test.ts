import { describe, expect, it } from "vitest";
import { mergeRootDotenvPublicBaseUrl, resolvePublicBaseUrl } from "./public-base-url";

describe("resolvePublicBaseUrl", () => {
  it("uses PUBLIC_BASE_URL and trims trailing slash", () => {
    expect(
      resolvePublicBaseUrl({
        PUBLIC_BASE_URL: "https://example.com/",
        RENDER_EXTERNAL_URL: "https://ignored.onrender.com",
      })
    ).toBe("https://example.com");
  });

  it("falls back to RENDER_EXTERNAL_URL when PUBLIC_BASE_URL is empty", () => {
    expect(
      resolvePublicBaseUrl({
        PUBLIC_BASE_URL: "",
        RENDER_EXTERNAL_URL: "https://app.onrender.com/",
      })
    ).toBe("https://app.onrender.com");
  });

  it("returns empty when neither is set", () => {
    expect(resolvePublicBaseUrl({})).toBe("");
  });
});

describe("mergeRootDotenvPublicBaseUrl", () => {
  it("overwrites PUBLIC_BASE_URL when key exists in parsed root env", () => {
    const into = { PUBLIC_BASE_URL: "https://old.example" } as NodeJS.ProcessEnv;
    mergeRootDotenvPublicBaseUrl(
      { PUBLIC_BASE_URL: "https://root.example", OTHER: "x" },
      into
    );
    expect(into["PUBLIC_BASE_URL"]).toBe("https://root.example");
  });

  it("does not touch target when PUBLIC_BASE_URL missing from parsed", () => {
    const into = { PUBLIC_BASE_URL: "https://keep.example" } as NodeJS.ProcessEnv;
    mergeRootDotenvPublicBaseUrl({ PORT: "10000" }, into);
    expect(into["PUBLIC_BASE_URL"]).toBe("https://keep.example");
  });
});
