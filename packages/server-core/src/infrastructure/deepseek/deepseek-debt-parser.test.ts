import { describe, expect, it } from "vitest";
import { DeepSeekDebtParser, mentionsDebt } from "./deepseek-debt-parser";

describe("mentionsDebt (префильтр перед LLM)", () => {
  it.each([
    "одолжил Саше 100р до конца месяца",
    "одолжил у Саши 100 рублей",
    "дал в долг Пете 50 BYN",
    "занял у Маши 200",
    "заняла у коллеги 20 рублей",
    "Саша должен мне 300",
    "я должен Саше 150",
    "дал взаймы брату 1000",
    "взял заём 500",
    "Петя вернул долг 100",
    "верну Маше 50 в пятницу",
    "долги по квартире 200",
  ])("долговое сообщение проходит гейт: %s", (text) => {
    expect(mentionsDebt(text)).toBe(true);
  });

  it.each([
    "купил молоко 5 BYN",
    "обед в кафе 25 рублей",
    "получил зарплату 5000",
    "бензин 60р",
    "оплатил интернет 30",
    "продал велосипед 150р",
    "такси 12 рублей",
  ])("обычная операция отсекается без LLM: %s", (text) => {
    expect(mentionsDebt(text)).toBe(false);
  });

  it("parse() без долговой лексики возвращает null, не дёргая LLM", async () => {
    const parser = new DeepSeekDebtParser("dummy-key-no-network");
    await expect(parser.parse("купил хлеб 3 BYN")).resolves.toBeNull();
  });
});
