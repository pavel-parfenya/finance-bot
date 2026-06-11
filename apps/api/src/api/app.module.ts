import { Global, Module } from "@nestjs/common";
import {
  config,
  requireEnv,
  UserService,
  WorkspaceService,
  CustomCategoryService,
  TransactionRepository,
  InvitationRepository,
  DebtRepository,
  AppStatsService,
  SubscriptionService,
  BillingTokenService,
  FeatureService,
  PaymentService,
} from "@finance-bot/server-core";
import { getApiContainer } from "../di/api-container.context";
import { HttpTelegramOutboundAdapter } from "../di/http-telegram-outbound.adapter";
import { AppConfigModule } from "./app-config/app-config.module";
import { BOT_TOKEN, TELEGRAM_OUTBOUND } from "./tokens";
import { TelegramAuthService } from "./telegram/telegram-auth.service";
import { TelegramInitDataGuard } from "./telegram/telegram-init-data.guard";
import { TransactionsModule } from "./transactions/transactions.module";
import { WorkspaceModule } from "./workspace/workspace.module";
import { UserModule } from "./user/user.module";
import { DebtsModule } from "./debts/debts.module";
import { AdminModule } from "./admin/admin.module";
import { BillingModule } from "./billing/billing.module";
import { SubscriptionModule } from "./subscription/subscription.module";
import { AppStatsSnapshotScheduler } from "./app-stats-snapshot.scheduler";

@Global()
@Module({
  imports: [
    AppConfigModule,
    TransactionsModule,
    WorkspaceModule,
    UserModule,
    DebtsModule,
    AdminModule,
    // Billing/подписка (/api/billing/*, /api/subscription) — только в paid-режиме.
    ...(config.paymentMode === "paid" ? [BillingModule, SubscriptionModule] : []),
  ],
  providers: [
    { provide: UserService, useFactory: () => getApiContainer().userService },
    { provide: WorkspaceService, useFactory: () => getApiContainer().workspaceService },
    {
      provide: TransactionRepository,
      useFactory: () => getApiContainer().transactionRepo,
    },
    {
      provide: InvitationRepository,
      useFactory: () => getApiContainer().invitationRepo,
    },
    { provide: DebtRepository, useFactory: () => getApiContainer().debtRepo },
    {
      provide: CustomCategoryService,
      useFactory: () => getApiContainer().customCategoryService,
    },
    {
      provide: AppStatsService,
      useFactory: () => getApiContainer().appStatsService,
    },
    {
      provide: SubscriptionService,
      useFactory: () => getApiContainer().subscriptionService,
    },
    {
      provide: BillingTokenService,
      useFactory: () => getApiContainer().billingTokenService,
    },
    {
      provide: FeatureService,
      useFactory: () => getApiContainer().featureService,
    },
    {
      provide: PaymentService,
      useFactory: () => getApiContainer().paymentService,
    },
    { provide: BOT_TOKEN, useFactory: () => requireEnv("TELEGRAM_BOT_TOKEN") },
    { provide: TELEGRAM_OUTBOUND, useClass: HttpTelegramOutboundAdapter },
    TelegramAuthService,
    TelegramInitDataGuard,
    AppStatsSnapshotScheduler,
  ],
  exports: [
    UserService,
    WorkspaceService,
    TransactionRepository,
    InvitationRepository,
    DebtRepository,
    CustomCategoryService,
    AppStatsService,
    SubscriptionService,
    BillingTokenService,
    FeatureService,
    PaymentService,
    BOT_TOKEN,
    TELEGRAM_OUTBOUND,
    TelegramAuthService,
    TelegramInitDataGuard,
  ],
})
export class AppModule {}
