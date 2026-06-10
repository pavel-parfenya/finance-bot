import type { DataSource } from "typeorm";
import type { Config } from "../config";
import { TransactionRepository } from "../repositories/transaction-repository";
import { InvitationRepository } from "../repositories/invitation-repository";
import { DebtRepository } from "../repositories/debt-repository";
import { UserService } from "../services/user-service";
import { WorkspaceService } from "../services/workspace-service";
import { CustomCategoryRepository } from "../repositories/custom-category-repository";
import { CustomCategoryService } from "../services/custom-category-service";
import { AppStatsService } from "../services/app-stats-service";
import { SubscriptionService } from "../services/subscription-service";
import { BillingTokenService } from "../services/billing-token-service";
import { FeatureService } from "../services/feature-service";
import { StrapiPlanConfig } from "../infrastructure/strapi/strapi-plan-config";

export interface ApiServices {
  userService: UserService;
  workspaceService: WorkspaceService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
  debtRepo: DebtRepository;
  customCategoryService: CustomCategoryService;
  appStatsService: AppStatsService;
  subscriptionService: SubscriptionService;
  billingTokenService: BillingTokenService;
  featureService: FeatureService;
}

/** Минимальный набор для Nest Mini App API (без LLM/STT и т.д.). */
export function createApiServices(config: Config, dataSource: DataSource): ApiServices {
  const transactionRepo = new TransactionRepository(dataSource);
  const invitationRepo = new InvitationRepository(dataSource);
  const debtRepo = new DebtRepository(dataSource);
  const userService = new UserService(dataSource);
  const workspaceService = new WorkspaceService(dataSource);
  const customCategoryRepo = new CustomCategoryRepository(dataSource);
  const customCategoryService = new CustomCategoryService(customCategoryRepo);
  const appStatsService = new AppStatsService(dataSource);
  const subscriptionService = new SubscriptionService(dataSource);
  const billingTokenService = new BillingTokenService(config.billing.jwtSecret);
  const featureService = new FeatureService(
    config.paymentMode,
    subscriptionService,
    new StrapiPlanConfig(config.strapiApiUrl)
  );

  return {
    userService,
    workspaceService,
    transactionRepo,
    invitationRepo,
    debtRepo,
    customCategoryService,
    appStatsService,
    subscriptionService,
    billingTokenService,
    featureService,
  };
}
