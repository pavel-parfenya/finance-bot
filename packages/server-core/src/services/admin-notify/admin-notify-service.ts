import type { UserService } from "../user/user-service";
import { planTitle } from "../payment/payment-service.utils";
import type {
  SubscriptionCanceledEvent,
  SubscriptionPaidEvent,
} from "./admin-notify-service.types";
import {
  CANCEL_REASON_TEXT,
  formatEventDate,
  personDisplayName,
} from "./admin-notify-service.utils";

export type {
  SubscriptionCancelReason,
  SubscriptionCanceledEvent,
  SubscriptionPaidEvent,
} from "./admin-notify-service.types";

type SendTelegramMessage = (chatId: number, text: string) => Promise<void>;

/**
 * Служебные уведомления супер-админу в Telegram (о купленных/отменённых
 * подписках). Админ задаётся env-переменной SUPER_ADMIN_USERNAME; его chat id
 * находится по username среди пользователей бота.
 *
 * Все методы best-effort: любая ошибка (админ не задан/не найден, недоступен
 * сервис бота) логируется и НЕ прерывает основной поток — оплата/отмена
 * подписки важнее уведомления.
 */
export class AdminNotifyService {
  constructor(
    private readonly superAdminUsername: string | null,
    private readonly userService: UserService,
    private readonly sendTelegramMessage: SendTelegramMessage
  ) {}

  /** Успешная оплата платного тарифа (первичная покупка или продление). */
  async subscriptionPaid(event: SubscriptionPaidEvent): Promise<void> {
    const title = event.renewal ? "🔄 Продлена подписка" : "💰 Оплачена подписка";
    const lines = [
      `${title} «${planTitle(event.plan)}»`,
      `Пользователь: ${await this.describeUser(event.userId)}`,
    ];
    if (event.expiresAt) {
      lines.push(`Действует до: ${formatEventDate(event.expiresAt)}`);
    }
    if (event.test) lines.push("⚠️ Тестовый режим — деньги не списывались");
    await this.send(lines.join("\n"));
  }

  /** Купленная подписка отменена (пользователем, bePaid или неудачным списанием). */
  async subscriptionCanceled(event: SubscriptionCanceledEvent): Promise<void> {
    const lines = [
      `❌ Отменена подписка «${planTitle(event.plan)}»`,
      `Пользователь: ${await this.describeUser(event.userId)}`,
      `Причина: ${CANCEL_REASON_TEXT[event.reason]}`,
    ];
    if (event.expiresAt) {
      lines.push(`Доступ сохраняется до: ${formatEventDate(event.expiresAt)}`);
    }
    await this.send(lines.join("\n"));
  }

  private async describeUser(userId: number): Promise<string> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) return `id ${userId}`;
      return `${personDisplayName(user.username, Number(user.telegramId))} (id ${userId})`;
    } catch {
      return `id ${userId}`;
    }
  }

  private async send(text: string): Promise<void> {
    try {
      const name = this.superAdminUsername?.trim();
      if (!name) return; // супер-админ не настроен — уведомления выключены
      const admin = await this.userService.findByUsername(name);
      if (!admin) {
        console.error(
          `[admin-notify] супер-админ @${name} не найден среди пользователей бота — уведомление не отправлено`
        );
        return;
      }
      // Тумблер в настройках Mini App («Статистика приложения»).
      if (admin.adminSubscriptionNotifications === false) return;
      await this.sendTelegramMessage(Number(admin.telegramId), text);
    } catch (err) {
      console.error("[admin-notify] не удалось отправить уведомление:", err);
    }
  }
}
