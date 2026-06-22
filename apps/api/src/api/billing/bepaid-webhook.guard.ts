import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { config } from "@finance-bot/server-core";

/** Сравнение строк за постоянное время (без утечки по таймингу совпавшего префикса). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Аутентификация notify-webhook bePaid.
 *
 * bePaid шлёт нотификации с HTTP Basic Authorization, подписанной парой
 * shop_id:secret_key магазина (та же пара, что и для исходящих вызовов API).
 * Проверяем заголовок, чтобы отсечь поддельные/абьюзные POST'ы на публичный
 * `/api/billing/webhook`. Состояние подписки дополнительно перепроверяется
 * запросом к bePaid в `handleNotify` — это второй рубеж защиты.
 */
@Injectable()
export class BepaidWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Не bePaid (test-режим) — реального webhook нет, пропускаем.
    if (config.paymentGateway !== "bepaid") return true;

    const { shopId, secretKey } = config.bepaid;
    if (!shopId || !secretKey) {
      // Креды не заданы — подтвердить подлинность нечем; безопаснее отклонить.
      throw new HttpException(
        { error: "Webhook не сконфигурирован" },
        HttpStatus.UNAUTHORIZED
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? "";
    const expected = `Basic ${Buffer.from(`${shopId}:${secretKey}`, "utf8").toString(
      "base64"
    )}`;
    if (!safeEqual(header, expected)) {
      throw new HttpException(
        { error: "Недействительная авторизация webhook" },
        HttpStatus.UNAUTHORIZED
      );
    }
    return true;
  }
}
