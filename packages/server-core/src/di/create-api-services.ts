import type { DataSource } from "typeorm";
import type { Config } from "../config";
import { TransactionRepository } from "../repositories/transaction-repository";
import { InvitationRepository } from "../repositories/invitation-repository";
import { DebtRepository } from "../repositories/debt-repository";
import { EventRepository } from "../repositories/event-repository";
import { UserService } from "../services/user/user-service";
import { WorkspaceService } from "../services/workspace/workspace-service";
import { EventService } from "../services/event/event-service";
import { CustomCategoryRepository } from "../repositories/custom-category-repository";
import { CustomCategoryService } from "../services/custom-category/custom-category-service";
import { AppStatsService } from "../services/app-stats/app-stats-service";
import { SubscriptionService } from "../services/subscription/subscription-service";
import { BillingTokenService } from "../services/billing-token/billing-token-service";
import { FeatureService } from "../services/feature/feature-service";
import { PaymentService } from "../services/payment/payment-service";
import { AdminNotifyService } from "../services/admin-notify/admin-notify-service";
import { MetaCapiService } from "../services/meta-capi/meta-capi-service";
import { sendTelegramViaInternalBot } from "../infrastructure/telegram/internal-telegram-send";
import { StrapiPlanConfig } from "../infrastructure/strapi/strapi-plan-config";
import { StrapiSiteSettings } from "../infrastructure/strapi/strapi-site-settings";
import { buildPaymentGatewayConfig } from "./payment-gateway-config";

export interface ApiServices {
  userService: UserService;
  workspaceService: WorkspaceService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
  debtRepo: DebtRepository;
  eventService: EventService;
  customCategoryService: CustomCategoryService;
  appStatsService: AppStatsService;
  subscriptionService: SubscriptionService;
  billingTokenService: BillingTokenService;
  featureService: FeatureService;
  paymentService: PaymentService;
  strapiSiteSettings: StrapiSiteSettings;
}

/** Минимальный набор для Nest Mini App API (без LLM/STT и т.д.). */
export function createApiServices(config: Config, dataSource: DataSource): ApiServices {
  const transactionRepo = new TransactionRepository(dataSource);
  const invitationRepo = new InvitationRepository(dataSource);
  const debtRepo = new DebtRepository(dataSource);
  const eventRepo = new EventRepository(dataSource);
  const userService = new UserService(dataSource);
  const workspaceService = new WorkspaceService(dataSource);
  const customCategoryRepo = new CustomCategoryRepository(dataSource);
  const customCategoryService = new CustomCategoryService(customCategoryRepo);
  const appStatsService = new AppStatsService(dataSource);
  const subscriptionService = new SubscriptionService(dataSource);
  const billingTokenService = new BillingTokenService(config.billing.jwtSecret);
  const strapiPlanConfig = new StrapiPlanConfig(config.strapiApiUrl);
  const strapiSiteSettings = new StrapiSiteSettings(config.strapiApiUrl);
  const featureService = new FeatureService(
    config.paymentMode,
    subscriptionService,
    strapiPlanConfig
  );
  const eventService = new EventService({
    eventRepo,
    transactionRepo,
    debtRepo,
    userService,
    workspaceService,
    featureService,
  });
  // Уведомления супер-админу (SUPER_ADMIN_USERNAME) об оплатах/отменах подписок.
  const adminNotifyService = new AdminNotifyService(
    config.superAdminUsername,
    userService,
    sendTelegramViaInternalBot
  );
  // Server-side события Meta (InitiateCheckout/Purchase/Subscribe) — выключены без токена.
  const metaCapiService = new MetaCapiService({
    pixelId: config.metaCapi.pixelId,
    accessToken: config.metaCapi.accessToken,
    eventSourceUrl: `${config.landingBaseUrl}/subscribe`,
    testEventCode: config.metaCapi.testEventCode,
  });
  const paymentService = new PaymentService(
    buildPaymentGatewayConfig(config),
    subscriptionService,
    strapiPlanConfig,
    adminNotifyService,
    metaCapiService
  );

  return {
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    debtRepo,
    eventService,
    customCategoryService,
    appStatsService,
    subscriptionService,
    billingTokenService,
    featureService,
    paymentService,
    strapiSiteSettings,
  };
}
