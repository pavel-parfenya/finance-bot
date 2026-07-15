"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const META_PIXEL_ID = "1488305689648916";

type FbqFn = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: FbqFn;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

/**
 * Создаёт стаб fbq с очередью (аналог официального сниппета) и сразу ставит
 * `init` первым в очередь — поэтому порядок монтирования компонентов не важен:
 * событие, отправленное до загрузки fbevents.js, не потеряется и не обгонит init.
 */
function ensureFbq(): FbqFn {
  if (!window.fbq) {
    const stub = function (...args: unknown[]) {
      if (stub.callMethod) stub.callMethod(...args);
      else stub.queue.push(args);
    } as FbqFn;
    stub.push = stub;
    stub.loaded = true;
    stub.version = "2.0";
    stub.queue = [];
    window.fbq = stub;
    window._fbq = stub;
    stub("init", META_PIXEL_ID);
  }
  return window.fbq;
}

/** Безопасная отправка события Meta Pixel (no-op на сервере). */
export function fbq(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  ensureFbq()(...args);
}

let scriptLoaded = false;

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (scriptLoaded) return;
    scriptLoaded = true;
    ensureFbq();
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }, []);

  // PageView на первую загрузку и на каждую SPA-навигацию (Link не перезагружает
  // страницу, поэтому сниппет-вариант с одним PageView терял бы переходы).
  useEffect(() => {
    fbq("track", "PageView");
  }, [pathname]);

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
