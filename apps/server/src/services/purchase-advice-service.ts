import { buildPeriodRange } from "@finance-bot/shared";
import { aggregateByCategoryAndCurrency } from "../analytics/aggregate-transactions";
import { fetchExchangeRates } from "../analytics/fetch-exchange-rates";
import type {
  ParsedPurchaseQuestion,
  DeepSeekPurchaseAdviceParser,
} from "../infrastructure/deepseek/deepseek-purchase-advice";
import type { TransactionRepository } from "../repositories/transaction-repository";

const RATE_LIMIT_MS = process.env.NODE_ENV === "production" ? 5 * 60 * 1000 : 0; // 5 min в prod, без лимита в dev
const lastRequestByUser = new Map<number, number>();

export interface PurchaseAdviceServiceDeps {
  transactionRepo: TransactionRepository;
  purchaseAdviceParser: DeepSeekPurchaseAdviceParser;
}

export class PurchaseAdviceService {
  constructor(private readonly deps: PurchaseAdviceServiceDeps) {}

  async getAdvice(
    userId: number,
    workspaceIds: number[],
    question: ParsedPurchaseQuestion,
    voice: string
  ): Promise<string> {
    const now = Date.now();
    const last = lastRequestByUser.get(userId) ?? 0;
    if (RATE_LIMIT_MS > 0 && now - last < RATE_LIMIT_MS) {
      return "Подожди 5 минут перед следующим вопросом.";
    }

    if (workspaceIds.length === 0) {
      return "Нет данных о тратах. Добавь расходы, чтобы получить совет.";
    }

    const { start, end } = buildPeriodRange("current");
    const transactions = await this.deps.transactionRepo.findByWorkspaceIdsForPeriod(
      workspaceIds,
      start,
      end
    );

    let rates: Record<string, number> = {};
    try {
      rates = await fetchExchangeRates();
    } catch {
      rates["USD"] = 1;
    }

    const defaultCurrency = question.currency || "USD";
    const aggregated = aggregateByCategoryAndCurrency(
      transactions,
      rates,
      defaultCurrency
    );

    const totalCurrent = Number(aggregated.totalInDefault);
    const nowDate = new Date();
    const daysInMonth = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() + 1,
      0
    ).getDate();
    const daysPassed = nowDate.getDate();
    const forecast =
      daysPassed > 0 ? (totalCurrent / daysPassed) * daysInMonth : totalCurrent;

    const spending = {
      byCategory: aggregated.byCategory,
      totalCurrentMonth: aggregated.totalInDefault,
      forecastEndOfMonth: forecast.toFixed(0),
      defaultCurrency,
    };

    const advice = await this.deps.purchaseAdviceParser.generateAdvice(
      question,
      spending,
      voice
    );

    lastRequestByUser.set(userId, now);
    return advice;
  }
}
