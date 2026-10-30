import { describe, expect, it } from "vitest";
import { transactionsToCsv } from "./transactions.service";

describe("transactionsToCsv", () => {
  it("BOM, ; и экранирование", () => {
    const csv = transactionsToCsv(
      [
        {
          occurredAt: new Date("2026-10-01T09:30:00Z"),
          type: "expense",
          category: "Еда",
          description: 'Кофе; "латте"',
          amount: "4.50",
          currency: "BYN",
          store: "",
          personDisplayName: "Паша",
        },
      ],
      "Europe/Minsk"
    );
    expect(csv.startsWith("﻿Дата;Тип;")).toBe(true);
    expect(csv.split("\r\n")[1]).toBe(
      '2026-10-01 12:30;Расход;Еда;"Кофе; ""латте""";4,50;BYN;;Паша'
    );
  });
});
