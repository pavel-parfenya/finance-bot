import { DataSource, Repository } from "typeorm";
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../database/entities";

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
      bepaidSubscriptionId: null,
      bepaidPlanId: null,
    });
  }

  /** Подписка по идентификатору bePaid (`sbs_…`) или null. */
  async findByBepaidSubscriptionId(
    bepaidSubscriptionId: string
  ): Promise<Subscription | null> {
    return this.repo.findOne({
      where: { bepaidSubscriptionId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Сохранить id создаваемой подписки bePaid ДО подтверждения оплаты — чтобы при
   * повторном checkout можно было отменить прежнюю (нет двойных списаний) и чтобы
   * webhook нашёл строку. Доступ НЕ выдаёт: `plan`/`expiresAt` не трогаются,
   * гейтинг по-прежнему видит текущий (Free) тариф до прихода notify.
   */
  async setPendingBepaidSubscription(
    userId: number,
    meta: { bepaidSubscriptionId: string; bepaidPlanId: string }
  ): Promise<void> {
    let sub = await this.findCurrent(userId);
    if (!sub) {
      sub = this.repo.create({
        userId,
        plan: SubscriptionPlan.Free,
        status: SubscriptionStatus.Active,
      });
    }
    sub.bepaidSubscriptionId = meta.bepaidSubscriptionId;
    sub.bepaidPlanId = meta.bepaidPlanId;
    await this.repo.save(sub);
  }

  /**
   * Сменить/назначить тариф. Создаёт запись, если её нет, иначе обновляет
   * существующую. Без оплаты — здесь только доменное состояние подписки
   * (оплата идёт через PaymentService.activatePaid).
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
   * Активировать платный тариф после успешной оплаты/продления. Ставит статус
   * active, выставляет срок и сохраняет идентификаторы подписки bePaid.
   *
   * Срок (`expiresAt`):
   * - если передан `meta.expiresAt` (из bePaid `active_to`) — он источник истины:
   *   bePaid сам ведёт расписание автопродления, мы лишь зеркалим конец периода.
   *   На каждом notify-продлении `active_to` сдвигается вперёд — срок продлевается.
   * - иначе (test-режим, без bePaid) считаем сами; при действующем оплаченном
   *   периоде новый пристыковывается к его концу, а не к «сейчас».
   */
  async activatePaid(
    userId: number,
    plan: SubscriptionPlan,
    meta?: {
      expiresAt?: Date | null;
      bepaidSubscriptionId?: string | null;
      bepaidPlanId?: string | null;
      paymentId?: string | null;
    }
  ): Promise<Subscription> {
    const now = new Date();
    let sub = await this.findCurrent(userId);

    let expiresAt: Date | null;
    // Сбрасывать ли начало периода на now (новая покупка вне действующего срока).
    let resetStart: boolean;
    if (meta?.expiresAt) {
      // bePaid — источник истины по сроку (active_to); начало не сбрасываем
      // (это продолжение той же подписки: первичная активация или продление).
      expiresAt = meta.expiresAt;
      resetStart = false;
    } else {
      const extending = hasActivePaidPeriod(sub, now);
      const periodStart = extending ? sub!.expiresAt! : now;
      expiresAt = computeExpiresAt(plan, periodStart);
      resetStart = !extending;
    }

    if (!sub) {
      sub = this.repo.create({ userId });
    }

    sub.plan = plan;
    sub.status = SubscriptionStatus.Active;
    // Новая покупка вне действующего периода — начало с now; иначе сохраняем
    // исходное начало (а для первой активации проставляем now).
    if (resetStart || !sub.startsAt) sub.startsAt = now;
    sub.expiresAt = expiresAt;
    // Оплата прошла — гасим ссылку: токены с iat <= now становятся недействительны.
    sub.linkRevokedAt = now;
    if (meta?.bepaidSubscriptionId) sub.bepaidSubscriptionId = meta.bepaidSubscriptionId;
    if (meta?.bepaidPlanId) sub.bepaidPlanId = meta.bepaidPlanId;
    if (meta?.paymentId) sub.paymentId = meta.paymentId;

    return this.repo.save(sub);
  }

  /**
   * Пометить подписку отменённой по её bePaid-идентификатору (по notify об
   * отмене/исчерпании попыток списания). Доступ сохраняется до `expiresAt`.
   */
  async cancelByBepaidId(bepaidSubscriptionId: string): Promise<void> {
    const sub = await this.findByBepaidSubscriptionId(bepaidSubscriptionId);
    if (!sub) return;
    sub.status = SubscriptionStatus.Canceled;
    await this.repo.save(sub);
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
