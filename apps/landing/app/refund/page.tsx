import type { Metadata } from "next";
import Link from "next/link";
import { getCmsPage } from "@/lib/cms";
import { renderMarkdown } from "@/lib/markdown";
import { DocPageFallback } from "@/components/DocPageFallback";

export const metadata: Metadata = {
  title: "Политика возврата",
  description: "Условия возврата денежных средств",
};

export default async function RefundPage() {
  const page = await getCmsPage("refund");

  if (page?.content) {
    const html = renderMarkdown(page.content);
    const lastUpdated = page.lastUpdated
      ? new Date(page.lastUpdated).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;
    return (
      <section className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {page.title ?? "Политика возврата"}
        </h1>
        {lastUpdated && (
          <p className="text-sm text-gray-400 mb-12">Последнее обновление: {lastUpdated}</p>
        )}
        <div
          className="prose prose-sm prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </section>
    );
  }

  return (
    <DocPageFallback title="Политика возврата" lastUpdated="1 января 2025">
      <Section title="1. Право на возврат">
        <p>
          Вы вправе потребовать возврат денежных средств в течение{" "}
          <strong>14 (четырнадцати) календарных дней</strong> с момента
          оплаты подписки при условии, что услуга не была использована или
          была использована в минимальном объёме (не более 3 транзакций).
        </p>
      </Section>

      <Section title="2. Процедура возврата">
        <p>Для оформления возврата необходимо:</p>
        <ol className="list-decimal pl-5 space-y-1 mt-2">
          <li>
            Направить заявку на{" "}
            <Link href="/contacts" className="underline">
              [EMAIL]
            </Link>{" "}
            с темой «Возврат средств».
          </li>
          <li>
            Указать: дату оплаты, сумму, номер транзакции (из уведомления об
            оплате), причину возврата.
          </li>
          <li>Дождаться подтверждения — обрабатываем в течение 3 рабочих дней.</li>
        </ol>
      </Section>

      <Section title="3. Срок зачисления">
        <p>
          После одобрения возврат зачисляется на карту в течение 5–10 рабочих
          дней в зависимости от банка-эмитента.
        </p>
      </Section>

      <Section title="4. Исключения">
        <p>Возврат не производится в случае:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Прошло более 14 дней с момента оплаты.</li>
          <li>Услуга была использована в полном объёме.</li>
          <li>Подписка была отменена пользователем и использована до конца периода.</li>
        </ul>
      </Section>

      <Section title="5. Контакты">
        <p>
          По вопросам возврата:{" "}
          <Link href="/contacts" className="underline">
            [EMAIL]
          </Link>
        </p>
      </Section>
    </DocPageFallback>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="text-gray-600">{children}</div>
    </div>
  );
}
