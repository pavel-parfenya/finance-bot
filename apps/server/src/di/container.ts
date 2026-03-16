import { DataSource } from "typeorm";
import { Config } from "../config";
import { DeepSeekMessageParser } from "../infrastructure/deepseek/deepseek-message-parser";
import { WhisperSpeechRecognizer } from "../infrastructure/whisper/whisper-speech-recognizer";
import { TransactionRepository } from "../repositories/transaction-repository";
import { InvitationRepository } from "../repositories/invitation-repository";
import { UserService } from "../services/user-service";
import { WorkspaceService } from "../services/workspace-service";
import { ExpenseService } from "../services/expense-service";
import { createBot } from "../bot/bot";
import { Bot } from "grammy";

export interface AppContainer {
  bot: Bot;
  userService: UserService;
  workspaceService: WorkspaceService;
  expenseService: ExpenseService;
  transactionRepo: TransactionRepository;
  invitationRepo: InvitationRepository;
}

export function buildContainer(config: Config, dataSource: DataSource): AppContainer {
  const parser = new DeepSeekMessageParser(config.deepseek.apiKey);
  const recognizer = new WhisperSpeechRecognizer(
    config.whisper.apiKey,
    config.whisper.baseUrl
  );

  const transactionRepo = new TransactionRepository(dataSource);
  const invitationRepo = new InvitationRepository(dataSource);
  const userService = new UserService(dataSource);
  const workspaceService = new WorkspaceService(dataSource);
  const expenseService = new ExpenseService(parser, recognizer);

  const miniAppUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/app` : "";

  const bot = createBot(config.telegram.botToken, {
    userService,
    workspaceService,
    expenseService,
    transactionRepo,
    invitationRepo,
    miniAppUrl,
  });

  return {
    bot,
    userService,
    workspaceService,
    expenseService,
    transactionRepo,
    invitationRepo,
  };
}
