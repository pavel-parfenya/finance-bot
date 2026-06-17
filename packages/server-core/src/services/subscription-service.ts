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

const PAID_PLANS = new Set<SubscriptionPlan>([
  SubscriptionPlan.ProMonth,
  SubscriptionPlan.ProYear,
]);

/**
 * Действует ли у подписки оплаченный период прямо сейчас.
 *
 * `true`, если план платный и `expiresAt` ещё в будущем — даже при статусе
 * `canceled` (отмена лишь выключает продление, доступ сохраняется до конца
 * оплаченного срока).
 */
function hasActivePaidPeriod(
  sub: Pick<Subscription, "plan" | "expiresAt"> | null,
  now: Date
): boolean {
  return (
    !!sub &&
    PAID_PLANS.has(sub.plan) &&
    !!sub.expiresAt &&
    sub.expiresAt.getTime() > now.getTime()
  );
}

/**
 * Эффективный (реально действующий сейчас) тариф подписки.
 *
 * Платный тариф продолжает действовать до `expiresAt` независимо от статуса
 * (в т.ч. после отмены — `canceled`), а по истечении срока фичи обрезаются до
 * Free. Это позволяет не держать отдельный cron-даунгрейд: гейтинг сам видит
 * Free, как только период оплаты закончился.
 */
export function resolveEffectivePlan(
  sub: Pick<Subscription, "plan" | "expiresAt">,
  now: Date = new Date()
): SubscriptionPlan {
  if (
    PAID_PLANS.has(sub.plan) &&
    sub.expiresAt &&
    sub.expiresAt.getTime() <= now.getTime()
  ) {
    return SubscriptionPlan.Free;
  }
  return sub.plan;
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

  /**
   * Активировать платный тариф после успешной оплаты. Ставит статус active,
   * рассчитывает срок и (опционально) сохраняет идентификаторы платежа WebPay.
   *
   * Если у пользователя ещё действует оплаченный период (в т.ч. после `cancel`),
   * новый период пристыковывается к его концу, а не к «сейчас»: покупка поверх
   * годовой подписки 01.01.26–01.01.27 продлевает её до 01.01.28, а не сжигает
   * остаток. Если же срок истёк (или подписки не было) — отсчёт идёт от now.
   */
  async activatePaid(
    userId: number,
    plan: SubscriptionPlan,
    meta?: { webpayOrderId?: string | null; paymentId?: string | null }
  ): Promise<Subscription> {
    const now = new Date();
    let sub = await this.findCurrent(userId);

    const extending = hasActivePaidPeriod(sub, now);
    // База нового периода: конец текущего оплаченного срока либо «сейчас».
    const periodStart = extending ? sub!.expiresAt! : now;

    if (!sub) {
      sub = this.repo.create({ userId });
    }

    sub.plan = plan;
    sub.status = SubscriptionStatus.Active;
    // При продлении сохраняем исходное начало периода, иначе — текущий момент.
    if (!extending) sub.startsAt = now;
    sub.expiresAt = computeExpiresAt(plan, periodStart);
    // Оплата прошла — гасим ссылку: токены с iat <= now становятся недействительны.
    sub.linkRevokedAt = now;
    if (meta?.webpayOrderId) sub.webpayOrderId = meta.webpayOrderId;
    if (meta?.paymentId) sub.paymentId = meta.paymentId;

    return this.repo.save(sub);
  }

  /**
   * Использована ли (погашена) ссылка на оплату для этого пользователя.
   * Billing-JWT с `iat` не позднее `linkRevokedAt` считается одноразово
   * израсходованным. Хранение в БД переживает рестарты и работает на нескольких
   * инстансах. `iatSeconds` — поле `iat` токена (Unix seconds).
   */
  async isPaymentLinkRevoked(
    userId: number,
    iatSeconds: number | undefined
  ): Promise<boolean> {
    if (typeof iatSeconds !== "number") return false;
    const sub = await this.findCurrent(userId);
    if (!sub?.linkRevokedAt) return false;
    return iatSeconds <= Math.floor(sub.linkRevokedAt.getTime() / 1000);
  }

  /** Отменить подписку (status = canceled). До expiresAt доступ обычно сохраняется. */
  async cancel(userId: number): Promise<Subscription | null> {
    const sub = await this.findCurrent(userId);
    if (!sub) return null;
    sub.status = SubscriptionStatus.Canceled;
    return this.repo.save(sub);
  }
}
