import type { Config } from "../config";
import type { PaymentGatewayConfig } from "../services/payment-service";

/**
 * Собирает конфигурацию платёжного шлюза из `Config`.
 * Сервисные URL WebPay выводятся из лендинга (возврат пользователя) и
 * публичного URL API (server-to-server notify).
 */
export function buildPaymentGatewayConfig(config: Config): PaymentGatewayConfig {
  return {
    gateway: config.paymentGateway,
    webpay: {
      storeId: config.webpay.storeId,
      secretKey: config.webpay.secretKey,
      formUrl: config.webpay.formUrl,
      testMode: config.webpay.testMode,
      currency: config.webpay.currency,
      returnUrl: `${config.landingBaseUrl}/payment-success`,
      cancelUrl: `${config.landingBaseUrl}/payment-failed`,
      notifyUrl: `${config.publicBaseUrl}/api/billing/webhook`,
    },
  };
}
