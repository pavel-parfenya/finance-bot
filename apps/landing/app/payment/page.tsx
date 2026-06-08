import type { Metadata } from "next";
import Link from "next/link";
import { getCmsPage } from "@/lib/cms";
import { renderMarkdown } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Оплата",
  description: "Способы оплаты подписки",
};

export default async function PaymentPage() {
  const page = await getCmsPage("payment");

  if (page?.content) {
    const html = renderMarkdown(page.content);
    return (
      <section className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {page.title ?? "Оплата"}
        </h1>
        <div
          className="prose prose-sm prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Оплата</h1>
      <p className="text-gray-500 mb-12">
        Подписка оформляется в боте. Оплата проходит через защищённый платёжный
        шлюз WebPay.
      </p>

      <div className="space-y-8">
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Способы оплаты</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0"></span>
              Банковские карты Visa, MasterCard, Белкарт
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0"></span>
              Интернет-банкинг белорусских банков
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0"></span>
              Рекуррентные списания (автопродление)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Автопродление</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            По умолчанию подписка продлевается автоматически. За 3 дня до
            списания придёт уведомление в боте. Отключить автопродление можно в
            настройках подписки в любой момент.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Валюта и безопасность</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Оплата принимается в белорусских рублях (BYN). Все транзакции
            обрабатываются через сертифицированный платёжный шлюз WebPay. Данные
            карты не хранятся на наших серверах.
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200 p-5">
          <p className="text-sm text-gray-600">
            Возникли вопросы по оплате?{" "}
            <Link href="/contacts" className="underline hover:text-gray-900">
              Напишите нам
            </Link>{" "}
            или ознакомьтесь с{" "}
            <Link href="/refund" className="underline hover:text-gray-900">
              политикой возврата
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
