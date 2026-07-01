import type { Metadata } from "next";
import Link from "next/link";
import { getCmsSiteSettings } from "@/lib/cms";

// Страница открывается редиректом из виджета bePaid. force-dynamic — чтобы
// Header/Footer и botUsername подтягивались из Strapi на каждый запрос, а не
// запекались на сборке (в CI Strapi недоступен → в статику попадёт [BRAND_NAME]).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оплата прошла успешно",
  description: "Платёж принят, подписка активируется",
  robots: { index: false, follow: false },
};

export default async function PaymentSuccessPage() {
  const settings = await getCmsSiteSettings();
  const botLink = settings?.botUsername
    ? `https://t.me/${settings.botUsername}`
    : "https://t.me/valentinethebuhgalter_bot";

  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Спасибо за оплату!</h1>
      <p className="text-gray-500 mb-8">
        Платёж принят. Подписка активируется в течение пары минут — вернитесь в
        бота и откройте «Настройки → Подписка».
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={botLink}
          className="inline-block rounded-md bg-gray-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          Вернуться в бота
        </Link>
        <Link
          href="/pricing"
          className="inline-block rounded-md border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Смотреть тарифы
        </Link>
      </div>
    </section>
  );
}
