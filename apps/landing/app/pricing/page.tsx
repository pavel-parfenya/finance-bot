import type { Metadata } from "next";
import Link from "next/link";
import { getCmsPricingPlans, getCmsSiteSettings } from "@/lib/cms";
import type { CmsPricingPlan } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Тарифы",
  description: "Выберите подходящий тариф для учёта финансов",
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
    ctaText: "Начать бесплатно",
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

function formatPrice(plan: CmsPricingPlan): string {
  if (plan.price === 0) return "0";
  if (plan.price == null) return "[PRICE]";
  return String(plan.price);
}

function formatPeriod(plan: CmsPricingPlan): string {
  if (plan.period === "month") return "/ месяц";
  if (plan.period === "year") return "/ год";
  return "";
}

export default async function PricingPage() {
  const [rawPlans, settings] = await Promise.all([
    getCmsPricingPlans(),
    getCmsSiteSettings(),
  ]);

  const plans = rawPlans.length > 0 ? rawPlans : FALLBACK_PLANS;
  const botLink = settings?.botUsername
    ? `https://t.me/${settings.botUsername}`
    : "https://t.me/valentinethebuhgalter_bot";

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Тарифы</h1>
        <p className="text-gray-500 text-lg">
          Начните бесплатно. Переходите на Pro, когда нужны голосовые сообщения.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border p-8 flex flex-col ${
              plan.isPopular
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-900"
            }`}
          >
            <div className="mb-6">
              <p
                className={`text-sm font-medium mb-1 ${
                  plan.isPopular ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {plan.description}
              </p>
              <h2 className="text-2xl font-bold">{plan.name}</h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{formatPrice(plan)}</span>
                {plan.price !== 0 && (
                  <span
                    className={`text-sm ${
                      plan.isPopular ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    BYN{formatPeriod(plan)}
                  </span>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {(plan.features ?? []).map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <svg
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      plan.isPopular ? "text-white" : "text-gray-900"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={plan.isPopular ? "text-gray-300" : "text-gray-600"}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-center rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
                plan.isPopular
                  ? "bg-white text-gray-900 hover:bg-gray-100"
                  : "bg-gray-900 text-white hover:bg-gray-700"
              }`}
            >
              {plan.ctaText ?? "Начать"}
            </a>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 mt-8">
        Есть вопросы?{" "}
        <Link href="/faq" className="underline hover:text-gray-600">
          Читайте FAQ
        </Link>{" "}
        или{" "}
        <Link href="/contacts" className="underline hover:text-gray-600">
          напишите нам
        </Link>
      </p>
    </section>
  );
}
