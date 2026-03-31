import { join } from "node:path";
import type { Application } from "express";
import express from "express";
import { CLIENT_DIST, getAppHtml, tryServeStatic } from "../http/static-helpers";

/**
 * Слой Express до Nest: health, статика, /app, SPA-фолбэк.
 * Webhook обрабатывается в `apps/bot`. Тело JSON — `express.json` в `main`.
 */
export function setupExpressLayer(expressApp: Application): void {
  expressApp.get("/health", (_req, res) => {
    res.type("text/plain").send("OK");
  });

  expressApp.use("/assets", express.static(join(CLIENT_DIST, "assets")));

  expressApp.use((req, res, next) => {
    if (req.method === "GET" && (req.path === "/app" || req.path.startsWith("/app/"))) {
      res.type("html").send(getAppHtml());
      return;
    }
    next();
  });

  expressApp.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      if (tryServeStatic(req.url, res)) return;
      if (req.path.startsWith("/assets/")) {
        res.status(404).end();
        return;
      }
      res.type("html").send(getAppHtml());
      return;
    }
    next();
  });
}
