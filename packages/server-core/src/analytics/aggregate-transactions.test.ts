import { describe, expect, it } from "vitest";
import type { TransactionForAggregation } from "./types";
import { aggregateByCategoryAndCurrency } from "./aggregate-transactions";

describe("aggregateByCategoryAndCurrency", () => {
  const ratesUsdBase: Record<string, number> = {
    USD: 1,
    EUR: 2,
  };

  it("aggregates expenses only by category in default currency", () => {
    const rows: TransactionForAggregation[] = [
      { amount: 100, currency: "USD", category: "Food", type: "expense" },
      { amount: 50, currency: "EUR", category: "Food", type: "expense" },
    ];
    const out = aggregateByCategoryAndCurrency(rows, ratesUsdBase, "USD");
    // 100 USD + 50 EUR / 2 * 1 = 100 + 25 = 125 in USD for Food (expense branch uses negative internally then abs for display)
    expect(out.byCategory.some((c) => c.category === "Food")).toBe(true);
    const food = out.byCategory.find((c) => c.category === "Food")!;
    expect(food.amount).toBe("125.00");
    expect(out.totalInDefault).toBe("125.00");
    expect(out.hasIncome).toBe(false);
  });

  it("tracks income vs expense when income present", () => {
    const rows: TransactionForAggregation[] = [
      { amount: 200, currency: "USD", category: "Salary", type: "income" },
      { amount: 50, currency: "USD", category: "Food", type: "expense" },
    ];
    const out = aggregateByCategoryAndCurrency(rows, ratesUsdBase, "USD");
    expect(out.hasIncome).toBe(true);
    expect(out.totalInDefault).toBe("150.00");
  });
});
