import { DataSource } from "typeorm";
import { Config } from "../config";
import { DeepSeekMessageParser } from "../infrastructure/deepseek/deepseek-message-parser";
import { WhisperSpeechRecognizer } from "../infrastructure/whisper/whisper-speech-recognizer";
import { GoogleSheetsClient } from "../infrastructure/google-sheets/google-sheets-client";
import { GoogleSheetsManager } from "../infrastructure/google-sheets/google-sheets-manager";
import { TransactionRepository } from "../repositories/transaction-repository";
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
}

export function buildContainer(config: Config, dataSource: DataSource): AppContainer {
  const parser = new DeepSeekMessageParser(config.deepseek.apiKey);
  const recognizer = new WhisperSpeechRecognizer(
    config.whisper.apiKey,
    config.whisper.baseUrl
  );

  const sheetsClient = new GoogleSheetsClient(config.googleSheets);
  const sheetManager = new GoogleSheetsManager(sheetsClient);

  const transactionRepo = new TransactionRepository(dataSource);
  const userService = new UserService(dataSource);
  const workspaceService = new WorkspaceService(dataSource, sheetManager);
  const expenseService = new ExpenseService(
    parser,
    recognizer,
    sheetManager,
    transactionRepo
  );

  const createSheetUrl = config.googleSheets.templateSheetId
    ? `https://docs.google.com/spreadsheets/d/${config.googleSheets.templateSheetId}/copy`
    : "https://sheets.new";

  const bot = createBot(config.telegram.botToken, {
    userService,
    workspaceService,
    expenseService,
    sheetManager,
    transactionRepo,
    botEmail: config.googleSheets.serviceAccountEmail,
    createSheetUrl,
  });

  return { bot, userService, workspaceService, expenseService };
}
