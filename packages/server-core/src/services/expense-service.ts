import { IMessageParser, ISpeechRecognizer } from "../domain/interfaces";
import { InvalidExpenseError } from "../domain/errors";
import { Expense } from "../domain/models";

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
    private readonly recognizer: ISpeechRecognizer
  ) {}

  async parseText(
    text: string,
    username: string,
    defaultCurrency?: string | null,
    customCategories?: Array<{ name: string; description: string }>
  ): Promise<Expense> {
    const parsed = await this.parser.parse(text, { defaultCurrency, customCategories });
    validateParsed(parsed);
    return {
      ...parsed,
      date: new Date(),
      username,
    };
  }

  async recognizeVoice(audioBuffer: Buffer, mimeType: string): Promise<string> {
    return this.recognizer.recognize(audioBuffer, mimeType);
  }

  async parseVoice(
    audioBuffer: Buffer,
    mimeType: string,
    username: string,
    defaultCurrency?: string | null,
    customCategories?: Array<{ name: string; description: string }>
  ): Promise<Expense> {
    const text = await this.recognizeVoice(audioBuffer, mimeType);
    return this.parseText(text, username, defaultCurrency, customCategories);
  }
}
