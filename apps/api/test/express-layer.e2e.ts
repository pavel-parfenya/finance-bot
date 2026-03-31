import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Express layer (e2e smoke)", () => {
  let app: express.Application;

  beforeAll(async () => {
    const prevCwd = process.cwd();
    process.chdir(apiRoot);
    try {
      const { setupExpressLayer } = await import("../src/utils/setup-express-layer");
      app = express();
      setupExpressLayer(app);
    } finally {
      process.chdir(prevCwd);
    }
  });

  it("GET /health returns OK", async () => {
    const res = await request(app).get("/health").expect(200);
    expect(res.text).toBe("OK");
  });

  it("GET /app returns HTML", async () => {
    const res = await request(app).get("/app").expect(200);
    expect(res.type).toMatch(/html/);
    expect(res.text.length).toBeGreaterThan(50);
  });

  it("GET /api/anything is not handled by static layer (no 200 html shell)", async () => {
    const res = await request(app).get("/api/workspace/info");
    expect(res.status).toBe(404);
  });
});
