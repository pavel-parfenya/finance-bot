import { IMessageParser, ISpeechRecognizer, ISheetManager } from "../domain/interfaces";
import { InvalidExpenseError } from "../domain/errors";
import { Expense } from "../domain/models";
import { TransactionRepository } from "../repositories/transaction-repository";

function validateParsed(parsed: { amount: number; description: string }): void {
  if (parsed.amount <= 0) {
    throw new InvalidExpenseError();
  }
  if (!parsed.description?.trim()) {
    throw new InvalidExpenseError();
  }
}

export class ExpenseService {
  constructor(
    private readonly parser: IMessageParser,
    private readonly recognizer: ISpeechRecognizer,
    private readonly sheetManager: ISheetManager,
    private readonly transactionRepo: TransactionRepository
  ) {}

  /** Только парсинг, без записи в Sheets. */
  async parseText(text: string, username: string): Promise<Expense> {
    const parsed = await this.parser.parse(text);
    validateParsed(parsed);
    return {
      ...parsed,
      date: new Date(),
      username,
    };
  }

  async processTextToSheets(
    text: string,
    username: string,
    sheetId: string
  ): Promise<Expense> {
    const expense = await this.parseText(text, username);
    await this.sheetManager.appendExpense(sheetId, expense);
    return expense;
  }

  /** Только распознавание + парсинг, без записи в Sheets. */
  async parseVoice(
    audioBuffer: Buffer,
    mimeType: string,
    username: string
  ): Promise<Expense> {
    const text = await this.recognizer.recognize(audioBuffer, mimeType);
    return this.parseText(text, username);
  }

  async processVoiceToSheets(
    audioBuffer: Buffer,
    mimeType: string,
    username: string,
    sheetId: string
  ): Promise<Expense> {
    const text = await this.recognizer.recognize(audioBuffer, mimeType);
    return this.processTextToSheets(text, username, sheetId);
  }
}
