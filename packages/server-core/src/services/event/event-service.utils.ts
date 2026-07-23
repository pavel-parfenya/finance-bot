export interface SettlementParticipant {
  userId: number;
  name: string;
  /** Сумма учитываемых трат участника в валюте события. */
  paid: number;
}

export interface SettlementTransfer {
  fromUserId: number;
  fromName: string;
  toUserId: number;
  toName: string;
  amount: number;
}

/**
 * Считает, кто кому сколько должен, чтобы уравнять траты события,
 * минимальным числом переводов (жадный min-cash-flow, ≤ N−1 переводов).
 *
 * Все суммы — уже в одной валюте (валюте события). Работает в центах, чтобы
 * избежать ошибок float; остаток от деления доли распределяется по 1 центу,
 * так что сумма балансов строго равна нулю.
 */
export function computeSettlement(
  participants: SettlementParticipant[]
): SettlementTransfer[] {
  const n = participants.length;
  if (n < 2) return [];

  const toCents = (v: number): number => Math.round(v * 100);
  const totalCents = participants.reduce((s, p) => s + toCents(p.paid), 0);
  if (totalCents <= 0) return [];

  const baseShare = Math.floor(totalCents / n);
  const remainder = totalCents - baseShare * n; // раздаём по 1 центу первым

  const balances = participants.map((p, i) => {
    const share = baseShare + (i < remainder ? 1 : 0);
    return { userId: p.userId, name: p.name, balance: toCents(p.paid) - share };
  });

  // Кому должны (переплатили) и кто должен (недоплатили).
  const creditors = balances
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < 0)
    .sort((a, b) => a.balance - b.balance); // самый «отрицательный» первым

  const transfers: SettlementTransfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amtCents = Math.min(c.balance, -d.balance);
    if (amtCents > 0) {
      transfers.push({
        fromUserId: d.userId,
        fromName: d.name,
        toUserId: c.userId,
        toName: c.name,
        amount: amtCents / 100,
      });
    }
    c.balance -= amtCents;
    d.balance += amtCents;
    if (c.balance === 0) ci++;
    if (d.balance === 0) di++;
  }

  return transfers;
}

/** Конвертирует сумму из валюты `from` в валюту `to` по курсам к USD. */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return (amount / fromRate) * toRate;
}
