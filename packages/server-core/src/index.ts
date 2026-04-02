import "reflect-metadata";

export {
  config,
  requireEnv,
  type Config,
  shouldEmbedTelegramBotInApi,
  resolveBotServiceBaseUrl,
} from "./config";
export { createDataSource, type DataSourceOptions } from "./database/data-source";
export { initDatabase } from "./database/init-database";
export * from "./database/entities";
export { createCoreServices, type CoreServices } from "./di/create-core-services";
export { createApiServices, type ApiServices } from "./di/create-api-services";
export { INFO_CHANGELOG_VERSION } from "./constants/info-changelog-version";
export { aggregateByCategoryAndCurrency } from "./analytics/aggregate-transactions";
export type { Insight, InsightType, AnalyticsVoice } from "./analytics/types";
export { TransactionRepository } from "./repositories/transaction-repository";
export { InvitationRepository } from "./repositories/invitation-repository";
export { DebtRepository } from "./repositories/debt-repository";
export { UserService } from "./services/user-service";
export { WorkspaceService } from "./services/workspace-service";
export { CustomCategoryService } from "./services/custom-category-service";
export { AnalyticsInsightService } from "./services/analytics-insight-service";
export { ExpenseService } from "./services/expense-service";
export { ExpenseCategory, IncomeCategory } from "./domain/models";
export type { ParsedExpense, Expense, TransactionType } from "./domain/models";
export type { ParsedDebt } from "./domain/models/debt";
export {
  isPurchaseAdviceQuestion,
  type ParsedPurchaseQuestion,
} from "./infrastructure/deepseek/deepseek-purchase-advice";
export { DeepSeekMonthlyReport } from "./infrastructure/deepseek/deepseek-monthly-report";
export { DebtService } from "./services/debt-service";
export { DeepSeekDebtParser } from "./infrastructure/deepseek/deepseek-debt-parser";
export { PurchaseAdviceService } from "./services/purchase-advice-service";
export {
  AppStatsService,
  APP_STATS_ACTIVE_HOURS,
  type AppStats,
  type AppStatsDailyPoint,
} from "./services/app-stats-service";
export { DeepSeekPurchaseAdviceParser } from "./infrastructure/deepseek/deepseek-purchase-advice";
