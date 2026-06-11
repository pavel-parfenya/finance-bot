import type { Metadata } from "next";
import Link from "next/link";
import { getCmsPricingPlans } from "@/lib/cms";
import type { CmsPricingPlan } from "@/lib/cms";
import { getBillingMe } from "@/lib/billing";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/billing";
import SubscribeActions from "./SubscribeActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Подписка",
  description: "Оформление подписки",
  robots: { index: false, follow: false },
};

const FALLBACK_PLANS: CmsPricingPlan[] = [
  {
    id: 1,
    name: "Free",
    price: 0,
    period: null,
    description: "Для старта",
    features: ["Текстовый ввод трат", "Базовая аналитика", "1 пространство"],
    isPopular: false,
    ctaText: "Бесплатно",
    sortOrder: 0,
  },
  {
    id: 2,
    name: "Pro",
    price: null,
    period: "month",
    description: "Для тех, кто ценит время",
    features: [
      "Всё из Free",
      "Голосовые сообщения",
      "AI-распознавание",
      "Расширенная аналитика",
      "Прогнозы трат",
      "Совместный учёт",
    ],
    isPopular: true,
    ctaText: "Выбрать Pro",
    sortOrder: 1,
  },
  {
    id: 3,
    name: "Pro Year",
    price: null,
    period: "year",
    description: "Выгоднее",
    features: ["Всё из Pro", "Приоритетная поддержка", "Скидка по сравнению с месячным"],
    isPopular: false,
    ctaText: "Выбрать годовой",
    sortOrder: 2,
  },
];

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  free: "Free",
  pro_month: "Pro (месяц)",
  pro_year: "Pro (год)",
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Активна",
  canceled: "Отменена",
  expired: "Истекла",
  past_due: "Просрочена",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-500 mb-8">{text}</p>
      <Link
        href="/pricing"
        className="inline-block rounded-md bg-gray-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors"
      >
        Смотреть тарифы
      </Link>
    </section>
  );
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  // Возврат пользователя после WebPay обрабатывают отдельные страницы
  // /payment-success и /payment-failed (returnUrl/cancelUrl шлюза).

  if (!token) {
    return (
      <Notice
        title="Нужна ссылка из бота"
        text="Откройте эту страницу через кнопку «Купить подписку» в Telegram-боте — так мы узнаем ваш аккаунт."
      />
    );
  }

  const [me, rawPlans] = await Promise.all([
    getBillingMe(token),
    getCmsPricingPlans(),
  ]);

  if (!me.ok) {
    return (
      <Notice
        title="Ссылка недействительна"
        text={`${me.error}. Вернитесь в бот и нажмите «Купить подписку» ещё раз — ссылка действует 1 час.`}
      />
    );
  }

  const plans = rawPlans.length > 0 ? rawPlans : FALLBACK_PLANS;
  const { user, subscription } = me.data;
  const expiresLabel = formatDate(subscription.expiresAt);

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Подписка</h1>
        <p className="text-gray-500 text-lg">
          {user.username ? `@${user.username.replace(/^@/, "")}, в` : "В"}ыберите
          подходящий тариф.
        </p>
      </div>

      <div className="mb-12 rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Текущий тариф</p>
          <p className="text-xl font-bold text-gray-900">
            {PLAN_LABEL[subscription.effectivePlan]}{" "}
            <span className="text-sm font-medium text-gray-500">
              · {STATUS_LABEL[subscription.status]}
            </span>
          </p>
          {subscription.downgradeScheduled && expiresLabel && (
            <p className="text-sm text-gray-500 mt-1">
              Pro отключится {expiresLabel}, затем — Free.
            </p>
          )}
        </div>
        {expiresLabel && (
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">
              {subscription.downgradeScheduled ? "Pro действует до" : "Действует до"}
            </p>
            <p className="text-lg font-semibold text-gray-900">{expiresLabel}</p>
          </div>
        )}
      </div>

      <SubscribeActions
        token={token}
        plans={plans}
        currentPlan={subscription.effectivePlan}
        downgradeScheduled={subscription.downgradeScheduled}
      />

      <p className="text-center text-sm text-gray-400 mt-10">
        Остались вопросы?{" "}
        <Link href="/faq" className="underline hover:text-gray-600">
          FAQ
        </Link>{" "}
        ·{" "}
        <Link href="/payment" className="underline hover:text-gray-600">
          Способы оплаты
        </Link>{" "}
        ·{" "}
        <Link href="/refund" className="underline hover:text-gray-600">
          Возврат
        </Link>
      </p>
    </section>
  );
}
