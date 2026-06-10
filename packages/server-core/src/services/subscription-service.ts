import { DataSource, Repository } from "typeorm";
import { Subscription, SubscriptionPlan, SubscriptionStatus } from "../database/entities";

/** Сколько длится платный период в зависимости от тарифа. */
function computeExpiresAt(plan: SubscriptionPlan, from: Date): Date | null {
  const next = new Date(from);
  if (plan === SubscriptionPlan.ProMonth) {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (plan === SubscriptionPlan.ProYear) {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  return null; // Free — без срока
}

export class SubscriptionService {
  private readonly repo: Repository<Subscription>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(Subscription);
  }

  /** Последняя по времени подписка пользователя (или null, если ни одной нет). */
  async findCurrent(userId: number): Promise<Subscription | null> {
    return this.repo.findOne({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Текущая подписка пользователя. Если записи ещё нет — возвращает
   * виртуальный Free (НЕ сохраняется в БД).
   */
  async getCurrentOrFree(userId: number): Promise<Subscription> {
    const existing = await this.findCurrent(userId);
    if (existing) return existing;
    return this.repo.create({
      userId,
      plan: SubscriptionPlan.Free,
      status: SubscriptionStatus.Active,
      startsAt: null,
      expiresAt: null,
      paymentId: null,
      recurringToken: null,
      webpayOrderId: null,
      webpayRecurringId: null,
    });
  }

  /**
   * Сменить/назначить тариф. Создаёт запись, если её нет, иначе обновляет
   * существующую. Оплата (WebPay) подключается в Sprint 4 — здесь только
   * доменное состояние подписки.
   */
  async changePlan(userId: number, plan: SubscriptionPlan): Promise<Subscription> {
    const now = new Date();
    let sub = await this.findCurrent(userId);

    if (!sub) {
      sub = this.repo.create({ userId });
    }

    sub.plan = plan;
    sub.status = SubscriptionStatus.Active;
    sub.startsAt = plan === SubscriptionPlan.Free ? null : now;
    sub.expiresAt = computeExpiresAt(plan, now);

    return this.repo.save(sub);
  }

  /** Отменить подписку (status = canceled). До expiresAt доступ обычно сохраняется. */
  async cancel(userId: number): Promise<Subscription | null> {
    const sub = await this.findCurrent(userId);
    if (!sub) return null;
    sub.status = SubscriptionStatus.Canceled;
    return this.repo.save(sub);
  }
}
