import { Bot } from "grammy";
import { UserService } from "../services/user-service";
import { WorkspaceService } from "../services/workspace-service";
import { ExpenseService } from "../services/expense-service";
import { createStartHandler } from "./handlers/start-handler";
import { createHelpHandler } from "./handlers/help-handler";
import { createTextHandler } from "./handlers/text-handler";
import { createVoiceHandler } from "./handlers/voice-handler";
import { createCancelExpenseHandler } from "./handlers/cancel-expense-handler";
import { TransactionRepository } from "../repositories/transaction-repository";
import { InvitationRepository } from "../repositories/invitation-repository";
import { createInviteHandler } from "./handlers/invite-handler";

export interface BotDeps {
  userService: UserService;
  workspaceService: WorkspaceService;
  expenseService: ExpenseService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
  /** URL Telegram Mini App для просмотра расходов (пусто — кнопка не показывается) */
  miniAppUrl: string;
}

export function createBot(token: string, deps: BotDeps): Bot {
  const bot = new Bot(token);

  bot.command("start", createStartHandler(deps));
  bot.command("help", createHelpHandler(deps));
  bot.callbackQuery(["cancel_expense", "save_expense"], createCancelExpenseHandler(deps));
  bot.callbackQuery(
    /^invite_(accept|decline|transfer|delete):(\d+)$/,
    createInviteHandler(deps)
  );

  bot.on("message:text", createTextHandler(deps));

  bot.on("message:voice", createVoiceHandler(deps));

  bot.catch((err) => {
    console.error("Ошибка бота:", err);
  });

  return bot;
}
