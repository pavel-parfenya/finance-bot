import { Inject, Injectable } from "@nestjs/common";
import { InlineKeyboard } from "grammy";
import type { EventCreateRequest, EventUpdateRequest } from "@finance-bot/shared";
import { EventService, EventError } from "@finance-bot/server-core";
import { TELEGRAM_OUTBOUND } from "../tokens";
import type { TelegramOutboundPort } from "../../di/telegram-outbound.port";
import type { ResolvedTelegramUser } from "../telegram/telegram-auth.types";

@Injectable()
export class EventsApiService {
  constructor(
    private readonly eventService: EventService,
    @Inject(TELEGRAM_OUTBOUND) private readonly telegram: TelegramOutboundPort
  ) {}

  private toError(err: unknown): { error: string } {
    if (err instanceof EventError) return { error: err.message };
    console.error("Events API error:", err);
    return { error: "Внутренняя ошибка" };
  }

  private parseId(raw: string): number | null {
    const id = parseInt(raw, 10);
    return isNaN(id) ? null : id;
  }

  async list(resolved: ResolvedTelegramUser) {
    try {
      const events = await this.eventService.getEventsForUser(resolved.userId);
      return { events };
    } catch (err) {
      return this.toError(err);
    }
  }

  async create(resolved: ResolvedTelegramUser, body: EventCreateRequest) {
    try {
      const event = await this.eventService.create(resolved.userId, body);
      return { event };
    } catch (err) {
      return this.toError(err);
    }
  }

  async detail(resolved: ResolvedTelegramUser, idRaw: string) {
    const id = this.parseId(idRaw);
    if (id === null) return { error: "Неверный ID" };
    try {
      const event = await this.eventService.getEventDetail(id, resolved.userId);
      return { event };
    } catch (err) {
      return this.toError(err);
    }
  }

  async update(resolved: ResolvedTelegramUser, idRaw: string, body: EventUpdateRequest) {
    const id = this.parseId(idRaw);
    if (id === null) return { error: "Неверный ID" };
    try {
      const event = await this.eventService.updateInfo(id, resolved.userId, body);
      return { event };
    } catch (err) {
      return this.toError(err);
    }
  }

  async remove(resolved: ResolvedTelegramUser, idRaw: string) {
    const id = this.parseId(idRaw);
    if (id === null) return { error: "Неверный ID" };
    try {
      await this.eventService.deleteEvent(id, resolved.userId);
      return { ok: true };
    } catch (err) {
      return this.toError(err);
    }
  }

  async invite(resolved: ResolvedTelegramUser, idRaw: string, username: string) {
    const id = this.parseId(idRaw);
    if (id === null) return { error: "Неверный ID" };
    try {
      const inv = await this.eventService.invite(id, resolved.userId, username);
      const kb = new InlineKeyboard()
        .text("Принять", `event_invite_accept:${inv.invitationId}`)
        .text("Отклонить", `event_invite_decline:${inv.invitationId}`);
      await this.telegram.sendMessage(
        inv.inviteeTelegramId,
        `${inv.inviterName} приглашает вас в событие «${inv.eventName}».\n\nПринять приглашение?`,
        { reply_markup: kb }
      );
      return { ok: true };
    } catch (err) {
      return this.toError(err);
    }
  }

  async leave(resolved: ResolvedTelegramUser, idRaw: string) {
    const id = this.parseId(idRaw);
    if (id === null) return { error: "Неверный ID" };
    try {
      await this.eventService.leaveEvent(id, resolved.userId);
      return { ok: true };
    } catch (err) {
      return this.toError(err);
    }
  }

  async removeMember(resolved: ResolvedTelegramUser, idRaw: string, userIdRaw: string) {
    const id = this.parseId(idRaw);
    const targetUserId = this.parseId(userIdRaw);
    if (id === null || targetUserId === null) return { error: "Неверный ID" };
    try {
      await this.eventService.removeMember(id, resolved.userId, targetUserId);
      return { ok: true };
    } catch (err) {
      return this.toError(err);
    }
  }

  async linkTransaction(
    resolved: ResolvedTelegramUser,
    idRaw: string,
    transactionId: number
  ) {
    const id = this.parseId(idRaw);
    if (id === null) return { error: "Неверный ID" };
    if (!transactionId) return { error: "Не указана транзакция" };
    try {
      await this.eventService.linkTransaction(id, resolved.userId, transactionId);
      return { ok: true };
    } catch (err) {
      return this.toError(err);
    }
  }

  async deleteTransaction(
    resolved: ResolvedTelegramUser,
    idRaw: string,
    txIdRaw: string
  ) {
    const id = this.parseId(idRaw);
    const txId = this.parseId(txIdRaw);
    if (id === null || txId === null) return { error: "Неверный ID" };
    try {
      await this.eventService.deleteTransaction(id, resolved.userId, txId);
      return { ok: true };
    } catch (err) {
      return this.toError(err);
    }
  }

  async setExcluded(
    resolved: ResolvedTelegramUser,
    idRaw: string,
    txIdRaw: string,
    excluded: boolean
  ) {
    const id = this.parseId(idRaw);
    const txId = this.parseId(txIdRaw);
    if (id === null || txId === null) return { error: "Неверный ID" };
    try {
      await this.eventService.setExcluded(id, resolved.userId, txId, excluded);
      return { ok: true };
    } catch (err) {
      return this.toError(err);
    }
  }

  async settle(resolved: ResolvedTelegramUser, idRaw: string) {
    const id = this.parseId(idRaw);
    if (id === null) return { error: "Неверный ID" };
    try {
      const event = await this.eventService.settle(id, resolved.userId);
      return { event };
    } catch (err) {
      return this.toError(err);
    }
  }

  async createDebt(resolved: ResolvedTelegramUser, idRaw: string, toUserId: number) {
    const id = this.parseId(idRaw);
    if (id === null) return { error: "Неверный ID" };
    if (!toUserId) return { error: "Не указан получатель" };
    try {
      const debt = await this.eventService.createDebtFromSettlement(
        id,
        resolved.userId,
        toUserId
      );
      // Уведомляем кредитора — он подтверждает/отклоняет долг в боте (как обычный долг).
      if (debt.creditorTelegramId) {
        const kb = new InlineKeyboard()
          .text("Подтвердить", `debt_confirm:${debt.debtId}`)
          .text("Отклонить", `debt_reject:${debt.debtId}`);
        try {
          await this.telegram.sendMessage(
            debt.creditorTelegramId,
            `${debt.debtorName} должен вам ${debt.amount} ${debt.currency} за событие «${debt.eventName}». Подтвердите или отклоните.`,
            { reply_markup: kb }
          );
        } catch (err) {
          console.error("Failed to send event debt notification:", err);
        }
      }
      return { ok: true };
    } catch (err) {
      return this.toError(err);
    }
  }
}
