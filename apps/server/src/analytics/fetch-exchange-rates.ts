const EXCHANGE_API = "https://open.er-api.com/v6/latest/USD";

export async function fetchExchangeRates(): Promise<Record<string, number>> {
  const res = await fetch(EXCHANGE_API);
  if (!res.ok) throw new Error("Ошибка загрузки курсов");
  const data = (await res.json()) as { rates?: Record<string, number> };
  const rates = data.rates ?? {};
  rates["USD"] = 1;
  return rates;
}
