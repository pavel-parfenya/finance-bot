import type { Config } from "../config";
import type { PaymentGatewayConfig } from "../services/payment-service";

/**
 * Собирает конфигурацию платёжного шлюза из `Config`.
 * Сервисные URL bePaid выводятся из лендинга (возврат пользователя) и
 * публичного URL API (server-to-server notify).
 */
export function buildPaymentGatewayConfig(config: Config): PaymentGatewayConfig {
  return {
    gateway: config.paymentGateway,
    bepaid: {
      shopId: config.bepaid.shopId,
      secretKey: config.bepaid.secretKey,
      checkoutBaseUrl: config.bepaid.checkoutBaseUrl,
      gatewayBaseUrl: config.bepaid.gatewayBaseUrl,
      testMode: config.bepaid.testMode,
      currency: config.bepaid.currency,
      returnUrl: `${config.landingBaseUrl}/payment-success`,
      cancelUrl: `${config.landingBaseUrl}/payment-failed`,
      notifyUrl: `${config.publicBaseUrl}/api/billing/webhook`,
    },
  };
}
