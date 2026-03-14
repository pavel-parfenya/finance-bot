import { Bot } from "grammy";
import { UserService } from "../services/user-service";
import { WorkspaceService } from "../services/workspace-service";
import { ExpenseService } from "../services/expense-service";
import { createStartHandler } from "./handlers/start-handler";
import { createLinkHandler } from "./handlers/link-handler";
import { createInviteHandler } from "./handlers/invite-handler";
import { createHelpHandler } from "./handlers/help-handler";
import { createTextHandler } from "./handlers/text-handler";
import { createVoiceHandler } from "./handlers/voice-handler";
import { createCancelExpenseHandler } from "./handlers/cancel-expense-handler";
import { TransactionRepository } from "../repositories/transaction-repository";
import { ISheetManager } from "../domain/interfaces";

export interface BotDeps {
  userService: UserService;
  workspaceService: WorkspaceService;
  expenseService: ExpenseService;
  sheetManager: ISheetManager;
  transactionRepo: TransactionRepository;
  botEmail: string;
  /** URL для создания таблицы (sheets.new или /copy шаблона) */
  createSheetUrl: string;
}

export function createBot(token: string, deps: BotDeps): Bot {
  const bot = new Bot(token);

  bot.command("start", createStartHandler(deps));
  bot.command("help", createHelpHandler(deps));
  bot.command("link", createLinkHandler(deps));
  bot.command("invite", createInviteHandler(deps));

  bot.callbackQuery("cancel_expense", createCancelExpenseHandler(deps));

  bot.on("message:text", createTextHandler(deps));

  bot.on("message:voice", createVoiceHandler(deps));

  bot.catch((err) => {
    console.error("Ошибка бота:", err);
  });

  return bot;
}
