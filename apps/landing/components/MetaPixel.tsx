"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, newMetaEventId } from "@/lib/meta-pixel";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    /** eventID первого PageView, отправленного инлайн-сниппетом в <head> (см. app/layout.tsx). */
    __fbInitialPvId?: string;
  }
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000"
).replace(/\/$/, "");

/** Значение cookie по имени (для `_fbp`/`_fbc` Meta Pixel). */
function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
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

/**
 * Серверный PageView (Conversions API), best-effort — ошибка сети не должна
 * ничего ломать в UI, поэтому просто игнорируется.
 */
function sendServerPageView(eventId: string): void {
  fetch(`${API_URL}/api/tracking/pageview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: window.location.href,
      eventId,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
    }),
    keepalive: true,
  }).catch(() => {});
}

export default function MetaPixel() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  // PageView на каждую SPA-навигацию (Link не перезагружает страницу, поэтому
  // сниппет в <head> отправляет PageView только на первую загрузку — его и
  // пропускаем, чтобы не задвоить браузерное событие). Серверный CAPI-дубль
  // шлём и на первую загрузку (eventID из window.__fbInitialPvId), и на
  // каждую последующую навигацию — с тем же eventID, что уходит в fbq.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (window.__fbInitialPvId) {
        sendServerPageView(window.__fbInitialPvId);
      }
      return;
    }
    const eventId = newMetaEventId();
    fbq("track", "PageView", {}, { eventID: eventId });
    sendServerPageView(eventId);
  }, [pathname]);

  // noscript через innerHTML: если рендерить <img> как JSX-ребёнка, гидрация
  // React создаёт его реальным DOM-элементом внутри <noscript>, и картинка
  // грузится даже при включённом JS → дубль PageView на каждый визит.
  return (
    <noscript
      dangerouslySetInnerHTML={{
        __html: `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" />`,
      }}
    />
  );
}
