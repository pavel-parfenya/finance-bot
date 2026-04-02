import type { DataSource } from "typeorm";
import type { Config } from "../config";
import { DeepSeekMessageParser } from "../infrastructure/deepseek/deepseek-message-parser";
import { DeepSeekDebtParser } from "../infrastructure/deepseek/deepseek-debt-parser";
import { WhisperSpeechRecognizer } from "../infrastructure/whisper/whisper-speech-recognizer";
import { TransactionRepository } from "../repositories/transaction-repository";
import { InvitationRepository } from "../repositories/invitation-repository";
import { DebtRepository } from "../repositories/debt-repository";
import { UserService } from "../services/user-service";
import { DebtService } from "../services/debt-service";
import { WorkspaceService } from "../services/workspace-service";
import { ExpenseService } from "../services/expense-service";
import { AnalyticsInsightService } from "../services/analytics-insight-service";
import { PurchaseAdviceService } from "../services/purchase-advice-service";
import { AppStatsService } from "../services/app-stats-service";
import { CustomCategoryRepository } from "../repositories/custom-category-repository";
import { CustomCategoryService } from "../services/custom-category-service";
import { DeepSeekPurchaseAdviceParser } from "../infrastructure/deepseek/deepseek-purchase-advice";
import { DeepSeekMonthlyReport } from "../infrastructure/deepseek/deepseek-monthly-report";
import { DeepSeekEndOfDayReminder } from "../infrastructure/deepseek/deepseek-end-of-day-reminder";
import { DeepSeekWeeklyForecast } from "../infrastructure/deepseek/deepseek-weekly-forecast";
import { DeepSeekInactiveUserNudge } from "../infrastructure/deepseek/deepseek-inactive-user-nudge";

export interface CoreServices {
  userService: UserService;
  workspaceService: WorkspaceService;
  expenseService: ExpenseService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
  debtService: DebtService;
  debtRepo: DebtRepository;
  debtParser: DeepSeekDebtParser;
  analyticsInsightService: AnalyticsInsightService;
  purchaseAdviceService: PurchaseAdviceService;
  purchaseAdviceParser: DeepSeekPurchaseAdviceParser;
  monthlyReportGenerator: DeepSeekMonthlyReport;
  endOfDayReminderGenerator: DeepSeekEndOfDayReminder;
  weeklyForecastGenerator: DeepSeekWeeklyForecast;
  inactiveUserNudgeGenerator: DeepSeekInactiveUserNudge;
  appStatsService: AppStatsService;
  customCategoryRepo: CustomCategoryRepository;
  customCategoryService: CustomCategoryService;
}

/** Все зависимости бота кроме экземпляра Grammу `Bot`. */
export function createCoreServices(config: Config, dataSource: DataSource): CoreServices {
  const parser = new DeepSeekMessageParser(config.deepseek.apiKey);
  const recognizer = new WhisperSpeechRecognizer(
    config.whisper.apiKey,
    config.whisper.baseUrl
  );

  const transactionRepo = new TransactionRepository(dataSource);
  const invitationRepo = new InvitationRepository(dataSource);
  const debtRepo = new DebtRepository(dataSource);
  const userService = new UserService(dataSource);
  const workspaceService = new WorkspaceService(dataSource);
  const debtService = new DebtService(debtRepo, userService);
  const debtParser = new DeepSeekDebtParser(config.deepseek.apiKey);
  const expenseService = new ExpenseService(parser, recognizer);
  const analyticsInsightService = new AnalyticsInsightService({ transactionRepo });
  const purchaseAdviceParser = new DeepSeekPurchaseAdviceParser(config.deepseek.apiKey);
  const purchaseAdviceService = new PurchaseAdviceService({
    transactionRepo,
    purchaseAdviceParser,
  });
  const monthlyReportGenerator = new DeepSeekMonthlyReport(config.deepseek.apiKey);
  const endOfDayReminderGenerator = new DeepSeekEndOfDayReminder(config.deepseek.apiKey);
  const weeklyForecastGenerator = new DeepSeekWeeklyForecast(config.deepseek.apiKey);
  const inactiveUserNudgeGenerator = new DeepSeekInactiveUserNudge(
    config.deepseek.apiKey
  );
  const appStatsService = new AppStatsService(dataSource);
  const customCategoryRepo = new CustomCategoryRepository(dataSource);
  const customCategoryService = new CustomCategoryService(customCategoryRepo);

  return {
    userService,
    workspaceService,
    expenseService,
    transactionRepo,
    invitationRepo,
    debtService,
    debtRepo,
    debtParser,
    analyticsInsightService,
    purchaseAdviceService,
    purchaseAdviceParser,
    monthlyReportGenerator,
    endOfDayReminderGenerator,
    weeklyForecastGenerator,
    inactiveUserNudgeGenerator,
    appStatsService,
    customCategoryRepo,
    customCategoryService,
  };
}
