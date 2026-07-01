import type { Metadata } from "next";
import Link from "next/link";
import { getCmsSiteSettings } from "@/lib/cms";

// force-dynamic — Header/Footer и botUsername из Strapi на каждый запрос, иначе
// на сборке (Strapi недоступен в CI) в статику запекается [BRAND_NAME].
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Оплата не прошла",
  description: "Платёж не был завершён",
  robots: { index: false, follow: false },
};

export default async function PaymentFailedPage() {
  const settings = await getCmsSiteSettings();
  const botLink = settings?.botUsername
    ? `https://t.me/${settings.botUsername}`
    : "https://t.me/valentinethebuhgalter_bot";

  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <svg
          className="h-8 w-8 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Оплата не прошла</h1>
      <p className="text-gray-500 mb-8">
        Платёж не был завершён, деньги не списаны. Попробуйте ещё раз: откройте
        страницу подписки из бота — «Настройки → Подписка».
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={botLink}
          className="inline-block rounded-md bg-gray-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          Вернуться в бота
        </Link>
        <Link
          href="/contacts"
          className="inline-block rounded-md border border-gray-300 text-gray-700 px-5 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          Связаться с нами
        </Link>
      </div>
    </section>
  );
}
