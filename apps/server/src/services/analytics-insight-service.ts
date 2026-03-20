import { buildPeriodRange } from "@finance-bot/shared";
import { aggregateByCategoryAndCurrency } from "../analytics/aggregate-transactions";
import { fetchExchangeRates } from "../analytics/fetch-exchange-rates";
import type { Insight } from "../analytics/types";
import type { TransactionRepository } from "../repositories/transaction-repository";
import { detectCategorySpike } from "./insights/category-spike";
import { detectMonthForecast } from "./insights/month-forecast";
import { detectTopCategory } from "./insights/top-category";
import {
  detectVsPrevMonthCategory,
  detectVsPrevMonthTotal,
} from "./insights/vs-prev-month";

export interface AnalyticsInsightServiceDeps {
  transactionRepo: TransactionRepository;
}

export class AnalyticsInsightService {
  constructor(private readonly deps: AnalyticsInsightServiceDeps) {}

  async computeInsights(
    workspaceIds: number[],
    defaultCurrency: string
  ): Promise<Insight[]> {
    if (workspaceIds.length === 0) return [];

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

    const totalCurrent = Number(currAgg.totalInDefault);
    const totalPrev = Number(prevAgg.totalInDefault);

    const insights: Insight[] = [];

    const categorySpike = detectCategorySpike(
      currAgg.byCategory,
      totalCurrent,
      defaultCurrency
    );
    if (categorySpike) insights.push(categorySpike);

    const monthForecast = detectMonthForecast(totalCurrent, defaultCurrency);
    if (monthForecast) insights.push(monthForecast);

    const topCategory = detectTopCategory(currAgg.byCategory, defaultCurrency);
    if (topCategory) insights.push(topCategory);

    const vsTotal = detectVsPrevMonthTotal(totalCurrent, totalPrev, defaultCurrency);
    if (vsTotal) insights.push(vsTotal);

    const vsCategory = detectVsPrevMonthCategory(
      currAgg.byCategory,
      prevAgg.byCategory,
      defaultCurrency
    );
    if (vsCategory) insights.push(vsCategory);

    return insights.sort((a, b) => a.priority - b.priority);
  }

  /** Данные для развёрнутого отчёта на конец месяца (LLM) */
  async getMonthlyReportData(
    workspaceIds: number[],
    defaultCurrency: string
  ): Promise<{
    currentByCategory: Array<{ category: string; amount: string }>;
    prevByCategory: Array<{ category: string; amount: string }>;
    totalCurrent: number;
    totalPrev: number;
    forecast: number;
    defaultCurrency: string;
  } | null> {
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

    const totalCurrent = Number(currAgg.totalInDefault);
    const totalPrev = Number(prevAgg.totalInDefault);

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const forecast =
      daysPassed > 0 ? (totalCurrent / daysPassed) * daysInMonth : totalCurrent;

    return {
      currentByCategory: currAgg.byCategory,
      prevByCategory: prevAgg.byCategory,
      totalCurrent,
      totalPrev,
      forecast,
      defaultCurrency,
    };
  }
}
