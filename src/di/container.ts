import { Config } from "../config";
import { DeepSeekMessageParser } from "../infrastructure/deepseek/deepseek-message-parser";
import { WhisperSpeechRecognizer } from "../infrastructure/whisper/whisper-speech-recognizer";
import { GoogleSheetsClient } from "../infrastructure/google-sheets/google-sheets-client";
import { GoogleSheetsExpenseRepository } from "../infrastructure/google-sheets/google-sheets-repository";
import { ExpenseService } from "../services/expense-service";
import { createBot } from "../bot/bot";
import { Bot } from "grammy";

export interface AppContainer {
  bot: Bot;
  expenseService: ExpenseService;
}

export function buildContainer(config: Config): AppContainer {
  const parser = new DeepSeekMessageParser(config.deepseek.apiKey);
  const recognizer = new WhisperSpeechRecognizer(
    config.whisper.apiKey,
    config.whisper.baseUrl
  );

  const sheetsClient = new GoogleSheetsClient(config.googleSheets);
  const repository = new GoogleSheetsExpenseRepository(sheetsClient);

  const expenseService = new ExpenseService(parser, recognizer, repository);
  const bot = createBot(config.telegram.botToken, expenseService);

  return { bot, expenseService };
}
