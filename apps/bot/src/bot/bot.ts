import { Bot } from "grammy";
import type {
  UserService,
  WorkspaceService,
  ExpenseService,
  AnalyticsInsightService,
  TransactionRepository,
  InvitationRepository,
  DebtService,
  DeepSeekDebtParser,
  PurchaseAdviceService,
  DeepSeekPurchaseAdviceParser,
  DeepSeekMonthlyReport,
  DeepSeekEndOfDayReminder,
  DeepSeekWeeklyForecast,
  DeepSeekInactiveUserNudge,
  CustomCategoryService,
} from "@finance-bot/server-core";
import { createStartHandler } from "./handlers/start-handler";
import { createHelpHandler } from "./handlers/help-handler";
import { createAppHandler } from "./handlers/app-handler";
import { createTextHandler } from "./handlers/text-handler";
import { createVoiceHandler } from "./handlers/voice-handler";
import { createCancelExpenseHandler } from "./handlers/cancel-expense-handler";
import { createCurrencyHandler, SET_CURRENCY_PREFIX } from "./handlers/currency-handler";
import { createInviteHandler } from "./handlers/invite-handler";
import { createDebtCallbackHandler } from "./handlers/debt-handler";
import {
  createTestAnalyticsHandler,
  createTestReminderEodHandler,
  createTestForecastHandler,
  createTestInactiveNudgeHandler,
} from "./handlers/test-notification-commands";

export interface BotDeps {
  userService: UserService;
  workspaceService: WorkspaceService;
  expenseService: ExpenseService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
  debtService: DebtService;
  debtParser: DeepSeekDebtParser;
  analyticsInsightService: AnalyticsInsightService;
  purchaseAdviceService?: PurchaseAdviceService;
  purchaseAdviceParser?: DeepSeekPurchaseAdviceParser;
  monthlyReportGenerator?: DeepSeekMonthlyReport;
  endOfDayReminderGenerator?: DeepSeekEndOfDayReminder;
  weeklyForecastGenerator?: DeepSeekWeeklyForecast;
  inactiveUserNudgeGenerator?: DeepSeekInactiveUserNudge;
  customCategoryService: CustomCategoryService;
  /** URL Telegram Mini App для просмотра расходов */
  miniAppUrl: string;
  /** Добавляется в createBot */
  bot?: Bot;
}

export function createBot(token: string, depsWithoutBot: BotDeps): Bot {
  const bot = new Bot(token);
  const deps = { ...depsWithoutBot, bot };

  bot.command("start", createStartHandler(deps));
  bot.command("help", createHelpHandler(deps));
  bot.command("app", createAppHandler(deps));
  bot.command("test_analytics", createTestAnalyticsHandler(deps));
  bot.command("test_reminder_eod", createTestReminderEodHandler(deps));
  bot.command("test_forecast", createTestForecastHandler(deps));
  bot.command("test_inactive_nudge", createTestInactiveNudgeHandler(deps));
  bot.callbackQuery(["cancel_expense", "save_expense"], createCancelExpenseHandler());
  bot.callbackQuery(new RegExp(`^${SET_CURRENCY_PREFIX}`), createCurrencyHandler(deps));
  bot.callbackQuery(
    /^invite_(accept|decline|transfer|delete):(\d+)$/,
    createInviteHandler(deps)
  );
  bot.callbackQuery(
    /^debt_(confirm|reject|repaid_add|repaid_skip):/,
    createDebtCallbackHandler(deps)
  );

  bot.on("message:text", createTextHandler(deps));

  bot.on("message:voice", createVoiceHandler(deps));

  bot.catch((err) => {
    console.error("Ошибка бота:", err);
  });

  return bot;
}
