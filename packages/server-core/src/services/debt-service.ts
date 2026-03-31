import { DebtRepository } from "../repositories/debt-repository";
import { UserService } from "./user-service";
import { DebtStatus } from "../database/entities";
import { ParsedDebt } from "../domain/models/debt";

function parseDeadline(hint: string | undefined): Date | null {
  if (!hint?.trim()) return null;
  const h = hint.toLowerCase();
  const now = new Date();

  if (/конец месяца|конец месяц|до конца/.test(h)) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  if (/начало месяца|начало месяц/.test(h)) {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const dMatch = h.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (dMatch) {
    const day = parseInt(dMatch[1], 10);
    const month = parseInt(dMatch[2], 10) - 1;
    const year = dMatch[3]
      ? parseInt(dMatch[3].length === 2 ? "20" + dMatch[3] : dMatch[3], 10)
      : now.getFullYear();
    return new Date(year, month, day);
  }
  return null;
}

/** Извлекает @username из текста (например "одолжил @sasha 100") */
function extractMentionedUsername(text: string): string | null {
  const match = text.match(/@(\w+)/);
  return match ? match[1].toLowerCase() : null;
}

export class DebtService {
  constructor(
    private readonly debtRepo: DebtRepository,
    private readonly userService: UserService
  ) {}

  async createFromParsed(
    creatorUserId: number,
    creatorName: string,
    parsed: ParsedDebt,
    originalText: string
  ): Promise<{
    debt: Awaited<ReturnType<DebtRepository["create"]>>;
    linkedUserTelegramId?: number;
    notificationMessage: string;
  }> {
    const mentioned = extractMentionedUsername(originalText);
    let debtorUserId: number | null = null;
    let creditorUserId: number | null = null;
    let status = DebtStatus.Active;
    let linkedUserTelegramId: number | undefined;

    if (parsed.iAmCreditor) {
      // Я одолжил — мне должны. Должник = other, кредитор = я
      if (mentioned) {
        const user = await this.userService.findByUsername(mentioned);
        if (user && user.id !== creatorUserId) {
          debtorUserId = user.id;
          status = DebtStatus.Pending;
          linkedUserTelegramId = Number(user.telegramId);
        }
      }
      const debt = await this.debtRepo.create({
        creatorUserId,
        debtorUserId,
        creditorUserId: creatorUserId,
        debtorName: parsed.otherPersonName,
        creditorName: creatorName,
        amount: parsed.amount,
        currency: parsed.currency,
        lentDate: new Date(),
        deadline: parseDeadline(parsed.deadlineHint),
        repaidAmount: 0,
        status,
        mainUserId: creatorUserId,
      });
      const msg = debtorUserId
        ? `Долг создан: ${parsed.otherPersonName} должен вам ${parsed.amount} ${parsed.currency}. Пользователь @${mentioned} получит уведомление для подтверждения.`
        : `Долг создан: ${parsed.otherPersonName} должен вам ${parsed.amount} ${parsed.currency}. Можете привязать пользователя через @username в приложении.`;
      return { debt, linkedUserTelegramId, notificationMessage: msg };
    } else {
      // Я занял — я должен. Должник = я, кредитор = other
      if (mentioned) {
        const user = await this.userService.findByUsername(mentioned);
        if (user && user.id !== creatorUserId) {
          creditorUserId = user.id;
          status = DebtStatus.Pending;
          linkedUserTelegramId = Number(user.telegramId);
        }
      }
      const mainUserId = creditorUserId ?? creatorUserId;
      const debt = await this.debtRepo.create({
        creatorUserId,
        debtorUserId: creatorUserId,
        creditorUserId,
        debtorName: creatorName,
        creditorName: parsed.otherPersonName,
        amount: parsed.amount,
        currency: parsed.currency,
        lentDate: new Date(),
        deadline: parseDeadline(parsed.deadlineHint),
        repaidAmount: 0,
        status,
        mainUserId,
      });
      const msg = creditorUserId
        ? `Долг создан: вы должны ${parsed.otherPersonName} ${parsed.amount} ${parsed.currency}. Пользователь @${mentioned} (кредитор) получит уведомление и сможет управлять записью.`
        : `Долг создан: вы должны ${parsed.otherPersonName} ${parsed.amount} ${parsed.currency}. Можете привязать кредитора через @username в приложении.`;
      return { debt, linkedUserTelegramId, notificationMessage: msg };
    }
  }

  async findByUserId(userId: number) {
    return this.debtRepo.findByUserId(userId);
  }

  async findById(id: number) {
    return this.debtRepo.findById(id);
  }

  async confirmDebt(id: number, userId: number): Promise<boolean> {
    const debt = await this.debtRepo.findById(id);
    if (!debt || debt.status !== DebtStatus.Pending) return false;
    const isCounterparty =
      (debt.debtorUserId === userId || debt.creditorUserId === userId) &&
      userId !== debt.creatorUserId;
    if (!isCounterparty) return false;
    const updates: { status: DebtStatus.Active; mainUserId?: number } = {
      status: DebtStatus.Active,
    };
    if (debt.creditorUserId === userId) {
      updates.mainUserId = userId;
    }
    await this.debtRepo.update(id, updates);
    return true;
  }

  async rejectDebt(id: number, userId: number): Promise<boolean> {
    const debt = await this.debtRepo.findById(id);
    if (!debt || debt.status !== DebtStatus.Pending) return false;
    const isCounterparty =
      (debt.debtorUserId === userId || debt.creditorUserId === userId) &&
      userId !== debt.creatorUserId;
    if (!isCounterparty) return false;
    await this.debtRepo.delete(id);
    return true;
  }
}
