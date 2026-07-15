"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Безопасная отправка события Meta Pixel (no-op на сервере).
 * `window.fbq` создаётся инлайн-сниппетом в <head> (см. app/layout.tsx) ещё до
 * гидрации, поэтому к моменту любых кликов/эффектов он уже существует.
 */
export function fbq(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  window.fbq?.(...args);
}

export default function MetaPixel() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  // PageView на каждую SPA-навигацию (Link не перезагружает страницу, поэтому
  // сниппет в <head> отправляет PageView только на первую загрузку — его и
  // пропускаем, чтобы не задвоить).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
