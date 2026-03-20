import type { ParsedDebt } from "../domain/models/debt";
import type { Expense } from "../domain/models";
import type { ParsedPurchaseQuestion } from "../infrastructure/deepseek/deepseek-purchase-advice";
import { isPurchaseAdviceQuestion } from "../infrastructure/deepseek/deepseek-purchase-advice";

export type MessageType = "debt" | "expense" | "purchase_advice";

export type ParsedMessage =
  | { type: "debt"; data: ParsedDebt }
  | { type: "expense"; data: Expense }
  | { type: "purchase_advice"; data: ParsedPurchaseQuestion };

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
  purchaseAdviceParser?: {
    parse(
      text: string,
      defaultCurrency?: string | null
    ): Promise<ParsedPurchaseQuestion | null>;
  };
}

/**
 * Классифицирует и парсит сообщение. Возвращает тип и данные.
 * Порядок проверки: debt → purchase_advice → expense.
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

  if (isPurchaseAdviceQuestion(text) && deps.purchaseAdviceParser) {
    const parsed = await deps.purchaseAdviceParser.parse(text, defaultCurrency);
    if (parsed) return { type: "purchase_advice", data: parsed };
    return null;
  }

  try {
    const expense = await deps.expenseService.parseText(text, username, defaultCurrency);
    return { type: "expense", data: expense };
  } catch {
    return null;
  }
}
