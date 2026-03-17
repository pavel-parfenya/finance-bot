import type { ParsedDebt } from "../domain/models/debt";
import type { Expense } from "../domain/models";

export type MessageType = "debt" | "expense";

export type ParsedMessage =
  | { type: "debt"; data: ParsedDebt }
  | { type: "expense"; data: Expense };

export interface MessageRouterDeps {
  debtParser: {
    parse(text: string, defaultCurrency?: string | null): Promise<ParsedDebt | null>;
  };
  expenseService: {
    parseText(
      text: string,
      username: string,
      defaultCurrency?: string | null
    ): Promise<Expense>;
  };
}

/**
 * Классифицирует и парсит сообщение. Возвращает тип и данные.
 * Порядок проверки: debt → expense (в будущем можно добавить другие типы).
 */
export async function parseMessage(
  text: string,
  username: string,
  defaultCurrency: string | null | undefined,
  deps: MessageRouterDeps
): Promise<ParsedMessage | null> {
  const parsedDebt = await deps.debtParser.parse(text, defaultCurrency);
  if (parsedDebt) {
    return { type: "debt", data: parsedDebt };
  }

  try {
    const expense = await deps.expenseService.parseText(text, username, defaultCurrency);
    return { type: "expense", data: expense };
  } catch {
    return null;
  }
}
