import type { Subscription } from "../../database/entities";
import type { BepaidConfig } from "../../infrastructure/bepaid/bepaid-client.types";

/** Конфигурация платёжного шлюза для PaymentService. */
export interface PaymentGatewayConfig {
  gateway: "bepaid" | "test";
  bepaid: BepaidConfig & {
    returnUrl: string;
    cancelUrl: string;
    notifyUrl: string;
  };
}

/** Результат checkout: тест-режим (подписка уже оформлена) или redirect на оплату bePaid. */
export type CheckoutResult =
  | { mode: "test"; subscription: Subscription }
  | { mode: "redirect"; redirectUrl: string };
