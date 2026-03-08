import {
  IExpenseRepository,
  IMessageParser,
  ISpeechRecognizer,
} from "../domain/interfaces";
import { Expense } from "../domain/models";

export class ExpenseService {
  constructor(
    private readonly parser: IMessageParser,
    private readonly recognizer: ISpeechRecognizer,
    private readonly repository: IExpenseRepository
  ) {}

  async processText(text: string, username: string): Promise<Expense> {
    const parsed = await this.parser.parse(text);
    const expense: Expense = { ...parsed, username };
    await this.repository.save(expense);
    return expense;
  }

  async processVoice(
    audioBuffer: Buffer,
    mimeType: string,
    username: string
  ): Promise<Expense> {
    const text = await this.recognizer.recognize(audioBuffer, mimeType);
    return this.processText(text, username);
  }
}
