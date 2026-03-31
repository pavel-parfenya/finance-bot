import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Response } from "express";

const ROOT = join(process.cwd(), "..", "..");
export const CLIENT_DIST = join(ROOT, "apps", "client", "dist");
const LEGACY_APP = join(ROOT, "public", "app.html");

export function getAppHtml(): string {
  for (const candidate of [
    join(CLIENT_DIST, "index.html"),
    join(CLIENT_DIST, "200.html"),
    LEGACY_APP,
  ]) {
    if (existsSync(candidate)) return readFileSync(candidate, "utf-8");
  }
  return "<!DOCTYPE html><html><body>Mini App not built. Run npm run build.</body></html>";
}

function getMimeType(ext: string): string {
  const types: Record<string, string> = {
    js: "application/javascript",
    mjs: "application/javascript",
    css: "text/css",
    ico: "image/x-icon",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    woff: "font/woff",
    woff2: "font/woff2",
    json: "application/json",
  };
  return types[ext] ?? "application/octet-stream";
}

/** Serves a file from CLIENT_DIST if it exists (path without query). */
export function tryServeStatic(url: string, res: Response): boolean {
  const safePath = url.split("?")[0];
  if (safePath.includes("..")) return false;
  const filePath = join(CLIENT_DIST, safePath.slice(1));
  if (existsSync(filePath)) {
    try {
      if (statSync(filePath).isDirectory()) return false;
    } catch {
      return false;
    }
    const ext = filePath.split(".").pop() ?? "";
    res.status(200).type(getMimeType(ext)).send(readFileSync(filePath));
    return true;
  }
  return false;
}
