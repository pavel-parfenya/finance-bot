import { buildPeriodRange } from "@finance-bot/shared";
import {
  aggregateByCategoryAndCurrency,
  aggregateExpensesByCategoryOnly,
} from "../analytics/aggregate-transactions";
import { fetchExchangeRates } from "../analytics/fetch-exchange-rates";
import type { MonthlyReportData } from "../infrastructure/deepseek/deepseek-monthly-report";
import type { TransactionRepository } from "../repositories/transaction-repository";

export interface AnalyticsInsightServiceDeps {
  transactionRepo: TransactionRepository;
}

export class AnalyticsInsightService {
  constructor(private readonly deps: AnalyticsInsightServiceDeps) {}

  /** Данные для развёрнутого месячного отчёта (LLM): расходы отдельно, доход — для сетевого прогноза. */
  async getMonthlyReportData(
    workspaceIds: number[],
    defaultCurrency: string
  ): Promise<MonthlyReportData | null> {
    if (workspaceIds.length === 0) return null;

    const { start: currStart, end: currEnd } = buildPeriodRange("current");
    const { start: prevStart, end: prevEnd } = buildPeriodRange("prev");

    const [currTx, prevTx] = await Promise.all([
      this.deps.transactionRepo.findByWorkspaceIdsForPeriod(
        workspaceIds,
        currStart,
        currEnd
      ),
      this.deps.transactionRepo.findByWorkspaceIdsForPeriod(
        workspaceIds,
        prevStart,
        prevEnd
      ),
    ]);

    let rates: Record<string, number> = {};
    try {
      rates = await fetchExchangeRates();
    } catch {
      rates["USD"] = 1;
    }

    const currAgg = aggregateByCategoryAndCurrency(currTx, rates, defaultCurrency);
    const prevAgg = aggregateByCategoryAndCurrency(prevTx, rates, defaultCurrency);

    const currExp = aggregateExpensesByCategoryOnly(currTx, rates, defaultCurrency);
    const prevExp = aggregateExpensesByCategoryOnly(prevTx, rates, defaultCurrency);

    const totalIncomeCurrent = Number(currAgg.totalIncomeInDefault ?? 0);
    const totalIncomePrev = Number(prevAgg.totalIncomeInDefault ?? 0);
    const hasIncomeCurrent = currAgg.hasIncome === true;

    const totalExpenseCurrent = currExp.totalExpense;
    const totalExpensePrev = prevExp.totalExpense;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const projectedExpenseEom =
      daysPassed > 0
        ? (totalExpenseCurrent / daysPassed) * daysInMonth
        : totalExpenseCurrent;

    const projectedNetEom = hasIncomeCurrent
      ? totalIncomeCurrent - projectedExpenseEom
      : null;

    return {
      defaultCurrency,
      currentExpenseByCategory: currExp.byCategory,
      prevExpenseByCategory: prevExp.byCategory,
      totalExpenseCurrent,
      totalExpensePrev,
      totalIncomeCurrent,
      totalIncomePrev,
      hasIncomeCurrent,
      projectedExpenseEom,
      projectedNetEom,
      daysPassed,
      daysInMonth,
    };
  }
}
