import { Inject, Injectable } from "@nestjs/common";
import { InlineKeyboard } from "grammy";
import type { DebtCreateRequest, DebtDto, DebtUpdateRequest } from "@finance-bot/shared";
import { DebtStatus, DebtRepository, UserService } from "@finance-bot/server-core";
import { TELEGRAM_OUTBOUND } from "../tokens";
import type { TelegramOutboundPort } from "../../di/telegram-outbound.port";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

@Injectable()
export class DebtsApiService {
  constructor(
    private readonly debtRepo: DebtRepository,
    private readonly userService: UserService,
    @Inject(TELEGRAM_OUTBOUND) private readonly telegram: TelegramOutboundPort
  ) {}

  private toDebtDto(
    d: Awaited<ReturnType<DebtRepository["findById"]>>,
    userId: number
  ): DebtDto | null {
    if (!d) return null;
    const isCreditor = d.creditorUserId === userId;
    const debtWithRelations = d as {
      debtor?: { username?: string | null } | null;
      creditor?: { username?: string | null } | null;
    };
    return {
      id: d.id,
      debtorName: d.debtorName,
      creditorName: d.creditorName,
      debtorUserId: d.debtorUserId,
      creditorUserId: d.creditorUserId,
      debtorUsername: debtWithRelations.debtor?.username ?? null,
      creditorUsername: debtWithRelations.creditor?.username ?? null,
      amount: Number(d.amount),
      currency: d.currency,
      lentDate: d.lentDate
        ? d.lentDate instanceof Date
          ? d.lentDate.toISOString().slice(0, 10)
          : String(d.lentDate).slice(0, 10)
        : null,
      deadline: d.deadline
        ? d.deadline instanceof Date
          ? d.deadline.toISOString().slice(0, 10)
          : String(d.deadline).slice(0, 10)
        : null,
      repaidAmount: Number(d.repaidAmount),
      status: d.status as "pending" | "active",
      isMain: d.mainUserId === userId,
      isCreditor,
      createdAt:
        d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    };
  }

  async list(resolved: ResolvedTelegramUser) {
    const debts = await this.debtRepo.findByUserId(resolved.userId);
    return {
      debts: debts.map((d) => this.toDebtDto(d, resolved.userId)!).filter(Boolean),
    };
  }

  private async resolveUsernameToUser(
    username: string | null | undefined
  ): Promise<{ userId: number; telegramId: number } | { error: string } | null> {
    if (!username || !username.trim()) return null;
    const uname = username.replace(/^@/, "").trim().toLowerCase();
    if (!uname) return null;
    const user = await this.userService.findByUsername(uname);
    if (!user)
      return {
        error: `Пользователь @${uname} не найден. Он должен написать боту /start.`,
      };
    return { userId: user.id, telegramId: Number(user.telegramId) };
  }

  async create(resolved: ResolvedTelegramUser, body: DebtCreateRequest) {
    const creatorUserId = resolved.userId;
    const creatorDisplayName = resolved.creatorDisplayName;
    let debtorUserId: number | null = null;
    let creditorUserId: number | null = null;
    let mainUserId: number;
    let linkedUserTelegramId: number | undefined;

    if (body.iAmCreditor) {
      creditorUserId = creatorUserId;
      const resolvedDebtor = await this.resolveUsernameToUser(body.debtorUsername);
      if (resolvedDebtor !== null) {
        if ("error" in resolvedDebtor) return { error: resolvedDebtor.error };
        if (resolvedDebtor.userId === creatorUserId)
          return { error: "Нельзя привязать себя как должника" };
        debtorUserId = resolvedDebtor.userId;
        linkedUserTelegramId = resolvedDebtor.telegramId;
      }
      mainUserId = creatorUserId;
    } else {
      debtorUserId = creatorUserId;
      const resolvedCreditor = await this.resolveUsernameToUser(body.creditorUsername);
      if (resolvedCreditor !== null) {
        if ("error" in resolvedCreditor) return { error: resolvedCreditor.error };
        if (resolvedCreditor.userId === creatorUserId)
          return { error: "Нельзя привязать себя как кредитора" };
        creditorUserId = resolvedCreditor.userId;
        linkedUserTelegramId = resolvedCreditor.telegramId;
      }
      mainUserId = creatorUserId;
    }

    const status =
      debtorUserId || creditorUserId ? DebtStatus.Pending : DebtStatus.Active;

    const debt = await this.debtRepo.create({
      creatorUserId,
      debtorUserId,
      creditorUserId,
      debtorName: body.debtorName,
      creditorName: body.creditorName,
      amount: body.amount,
      currency: body.currency,
      lentDate: body.lentDate ? new Date(body.lentDate) : null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      repaidAmount: body.repaidAmount ?? 0,
      mainUserId,
      status,
    });

    if (linkedUserTelegramId && debt.status === DebtStatus.Pending) {
      const debtorName = body.debtorName || body.creditorName || "—";
      const debtDesc = `${debtorName} — ${body.amount} ${body.currency}`;
      const msg = `${creatorDisplayName} создал(а) запись о долге: ${debtDesc}. Подтвердите или отклоните.`;
      const kb = new InlineKeyboard()
        .text("Подтвердить", `debt_confirm:${debt.id}`)
        .text("Отклонить", `debt_reject:${debt.id}`);
      try {
        await this.telegram.sendMessage(linkedUserTelegramId, msg, { reply_markup: kb });
      } catch (err) {
        console.error("Failed to send debt notification:", err);
      }
    }

    return { debt: this.toDebtDto(debt, resolved.userId)! };
  }

  async update(
    resolved: ResolvedTelegramUser,
    debtIdStr: string,
    updates: DebtUpdateRequest
  ) {
    const id = parseInt(debtIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID" };

    const debt = await this.debtRepo.findById(id);
    if (!debt) return { error: "Долг не найден" };
    if (debt.mainUserId !== resolved.userId)
      return { error: "Нет прав на редактирование" };

    const toUpdate: Parameters<DebtRepository["update"]>[1] = {};
    if (updates.debtorName !== undefined) toUpdate.debtorName = updates.debtorName;
    if (updates.creditorName !== undefined) toUpdate.creditorName = updates.creditorName;

    let linkedUserTelegramIdForNotify: number | undefined;

    if (updates.debtorUsername !== undefined) {
      const resolvedDebtor = await this.resolveUsernameToUser(updates.debtorUsername);
      if (resolvedDebtor !== null) {
        if ("error" in resolvedDebtor) return { error: resolvedDebtor.error };
        if (resolvedDebtor.userId === resolved.userId)
          return { error: "Нельзя привязать себя как должника" };
        toUpdate.debtorUserId = resolvedDebtor.userId;
        const isNewLink = debt.debtorUserId !== resolvedDebtor.userId;
        if (isNewLink) {
          toUpdate.status = DebtStatus.Pending;
          linkedUserTelegramIdForNotify = resolvedDebtor.telegramId;
        }
      } else {
        toUpdate.debtorUserId = null;
        toUpdate.status = DebtStatus.Active;
      }
    }
    if (updates.creditorUsername !== undefined) {
      const resolvedCreditor = await this.resolveUsernameToUser(updates.creditorUsername);
      if (resolvedCreditor !== null) {
        if ("error" in resolvedCreditor) return { error: resolvedCreditor.error };
        if (resolvedCreditor.userId === resolved.userId)
          return { error: "Нельзя привязать себя как кредитора" };
        toUpdate.creditorUserId = resolvedCreditor.userId;
        const isNewLink = debt.creditorUserId !== resolvedCreditor.userId;
        if (isNewLink) {
          toUpdate.status = DebtStatus.Pending;
          linkedUserTelegramIdForNotify = resolvedCreditor.telegramId;
          toUpdate.mainUserId = resolved.userId;
        }
      } else {
        toUpdate.creditorUserId = null;
        toUpdate.mainUserId = resolved.userId;
        toUpdate.status = DebtStatus.Active;
      }
    }
    if (updates.amount !== undefined) toUpdate.amount = updates.amount;
    if (updates.currency !== undefined) toUpdate.currency = updates.currency;
    if (updates.lentDate !== undefined)
      toUpdate.lentDate = updates.lentDate ? new Date(updates.lentDate) : null;
    if (updates.deadline !== undefined)
      toUpdate.deadline = updates.deadline ? new Date(updates.deadline) : null;
    if (updates.repaidAmount !== undefined) toUpdate.repaidAmount = updates.repaidAmount;

    const updated = await this.debtRepo.update(id, toUpdate);

    const debtWithRelations = debt as {
      debtor?: { telegramId: number } | null;
      creditor?: { telegramId: number } | null;
    };

    if (linkedUserTelegramIdForNotify && updated?.status === DebtStatus.Pending) {
      const creatorDisplayName = resolved.creatorDisplayName;
      const debtorName = updates.debtorName ?? debt.debtorName;
      const creditorName = updates.creditorName ?? debt.creditorName;
      const amount = updates.amount ?? Number(debt.amount);
      const currency = updates.currency ?? debt.currency;
      const debtDesc = `${debtorName || creditorName || "—"} — ${amount} ${currency}`;
      const msg = `${creatorDisplayName} привязал(а) вас к долгу: ${debtDesc}. Подтвердите или отклоните.`;
      const kb = new InlineKeyboard()
        .text("Подтвердить", `debt_confirm:${id}`)
        .text("Отклонить", `debt_reject:${id}`);
      try {
        await this.telegram.sendMessage(linkedUserTelegramIdForNotify, msg, {
          reply_markup: kb,
        });
      } catch (err) {
        console.error("Failed to send debt notification:", err);
      }
    } else {
      const changes: string[] = [];
      const amountChanged =
        updates.amount !== undefined && Number(debt.amount) !== updates.amount;
      const currencyChanged =
        updates.currency !== undefined && debt.currency !== updates.currency;
      if (amountChanged && currencyChanged) {
        changes.push(
          `Сумма: ${debt.amount} ${debt.currency} → ${updates.amount} ${updates.currency}`
        );
      } else if (amountChanged) {
        changes.push(`Сумма: ${debt.amount} → ${updates.amount} ${debt.currency}`);
      } else if (currencyChanged) {
        changes.push(`Валюта: ${debt.currency} → ${updates.currency}`);
      }
      if (updates.deadline !== undefined) {
        const oldD = debt.deadline
          ? debt.deadline instanceof Date
            ? debt.deadline.toISOString().slice(0, 10)
            : String(debt.deadline).slice(0, 10)
          : "—";
        const newD = updates.deadline || "—";
        if (oldD !== newD) changes.push(`Дедлайн: ${oldD} → ${newD}`);
      }
      if (
        updates.repaidAmount !== undefined &&
        Number(debt.repaidAmount) !== updates.repaidAmount
      ) {
        changes.push(`Возвращено: ${debt.repaidAmount} → ${updates.repaidAmount}`);
      }
      if (updates.debtorName !== undefined && debt.debtorName !== updates.debtorName) {
        changes.push(`Имя должника: ${debt.debtorName} → ${updates.debtorName}`);
      }
      if (
        updates.creditorName !== undefined &&
        debt.creditorName !== updates.creditorName
      ) {
        changes.push(`Имя кредитора: ${debt.creditorName} → ${updates.creditorName}`);
      }

      if (changes.length > 0) {
        let counterpartyTelegramId: number | undefined;
        let isDebtorCounterparty = false;
        if (
          debt.debtorUserId &&
          debt.debtorUserId !== resolved.userId &&
          debtWithRelations.debtor
        ) {
          counterpartyTelegramId = Number(debtWithRelations.debtor.telegramId);
          isDebtorCounterparty = true;
        } else if (
          debt.creditorUserId &&
          debt.creditorUserId !== resolved.userId &&
          debtWithRelations.creditor
        ) {
          counterpartyTelegramId = Number(debtWithRelations.creditor.telegramId);
        }

        if (counterpartyTelegramId && !isNaN(counterpartyTelegramId)) {
          const creatorDisplayName = resolved.creatorDisplayName;
          const msg = `${creatorDisplayName} изменил(а) долг:\n${changes.join("\n")}`;
          const repaidDelta =
            updates.repaidAmount !== undefined &&
            isDebtorCounterparty &&
            Number(updates.repaidAmount) > Number(debt.repaidAmount)
              ? Number(updates.repaidAmount) - Number(debt.repaidAmount)
              : 0;
          const addRepaidButtons = repaidDelta > 0;
          let replyMarkup:
            | { reply_markup: InstanceType<typeof InlineKeyboard> }
            | undefined;
          if (addRepaidButtons) {
            const kb = new InlineKeyboard()
              .text("Занести в расходы", `debt_repaid_add:${id}:${repaidDelta}`)
              .text("Не заносить", `debt_repaid_skip:${id}`);
            replyMarkup = { reply_markup: kb };
          }
          try {
            await this.telegram.sendMessage(
              counterpartyTelegramId,
              msg,
              replyMarkup ?? {}
            );
          } catch (err) {
            console.error("Failed to send debt update notification:", err);
          }
        }
      }
    }

    return { debt: this.toDebtDto(updated!, resolved.userId)! };
  }

  async remove(resolved: ResolvedTelegramUser, debtIdStr: string) {
    const id = parseInt(debtIdStr, 10);
    if (isNaN(id)) return { error: "Неверный ID" };

    const debt = await this.debtRepo.findById(id);
    if (!debt) return { error: "Долг не найден" };
    if (debt.mainUserId !== resolved.userId) return { error: "Нет прав на удаление" };

    const debtWithRelations = debt as {
      debtor?: { telegramId: number } | null;
      creditor?: { telegramId: number } | null;
    };
    let counterpartyTelegramId: number | undefined;
    if (
      debt.debtorUserId &&
      debt.debtorUserId !== resolved.userId &&
      debtWithRelations.debtor
    ) {
      counterpartyTelegramId = Number(debtWithRelations.debtor.telegramId);
    } else if (
      debt.creditorUserId &&
      debt.creditorUserId !== resolved.userId &&
      debtWithRelations.creditor
    ) {
      counterpartyTelegramId = Number(debtWithRelations.creditor.telegramId);
    }

    if (counterpartyTelegramId && !isNaN(counterpartyTelegramId)) {
      const creatorDisplayName = resolved.creatorDisplayName;
      const debtDesc = `${debt.debtorName} — ${debt.amount} ${debt.currency}`;
      const msg = `${creatorDisplayName} удалил(а) запись о долге: ${debtDesc}.`;
      try {
        await this.telegram.sendMessage(counterpartyTelegramId, msg);
      } catch (err) {
        console.error("Failed to send debt delete notification:", err);
      }
    }

    await this.debtRepo.delete(id);
    return { ok: true };
  }
}
