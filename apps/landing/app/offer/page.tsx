import type { Metadata } from "next";
import { getCmsPage, getCmsSiteSettings } from "@/lib/cms";
import { renderMarkdown } from "@/lib/markdown";
import { DocPageFallback } from "@/components/DocPageFallback";

export const metadata: Metadata = {
  title: "Публичная оферта",
  description: "Публичный договор оферты на оказание услуг",
};

export default async function OfferPage() {
  const page = await getCmsPage("offer");
  const settings = await getCmsSiteSettings();
  const brandName = settings?.companyName ?? "[BRAND_NAME]";
  const unp = settings?.unp ?? "[UNP]";
  const address = settings?.address ?? "[ADDRESS]";
  const email = settings?.email ?? "[EMAIL]";

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
          {page.title ?? "Публичная оферта"}
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
    <DocPageFallback title="Публичная оферта" lastUpdated="1 января 2025">
      <div className="space-y-8 text-sm leading-relaxed text-gray-600">
        <Section title="1. Общие положения">
          <p>
            Настоящий документ является публичной офертой {brandName} (далее —
            «Исполнитель», УНП: {unp}) и содержит условия оказания услуг доступа
            к Telegram-боту для учёта финансов.
          </p>
          <p className="mt-2">
            Акцептом настоящей оферты является оплата подписки через платёжный
            шлюз. С момента оплаты договор считается заключённым.
          </p>
        </Section>

        <Section title="2. Предмет договора">
          <p>
            Исполнитель предоставляет Пользователю доступ к программному
            обеспечению (Telegram-бот), включающему:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Распознавание голосовых сообщений с описанием трат.</li>
            <li>Хранение и категоризацию финансовых транзакций.</li>
            <li>Аналитику и отчёты по расходам.</li>
          </ul>
        </Section>

        <Section title="3. Стоимость и порядок оплаты">
          <p>
            Стоимость подписки определяется актуальным тарифным планом,
            опубликованным на странице{" "}
            <a href="/pricing" className="underline">
              /pricing
            </a>
            . Оплата производится в белорусских рублях (BYN) через платёжный
            шлюз WebPay.
          </p>
        </Section>

        <Section title="4. Срок действия подписки">
          <p>
            Подписка действует в течение оплаченного периода (месяц или год).
            При включённом автопродлении списание происходит в дату окончания
            текущего периода.
          </p>
        </Section>

        <Section title="5. Права и обязанности сторон">
          <p>Исполнитель обязуется:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Обеспечить доступность сервиса не менее 95% времени в месяц.</li>
            <li>Уведомлять о плановых технических работах не менее чем за 24 часа.</li>
            <li>Хранить данные Пользователя в соответствии с политикой конфиденциальности.</li>
          </ul>
          <p className="mt-3">Пользователь обязуется:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Не использовать сервис для незаконных целей.</li>
            <li>Не передавать доступ третьим лицам.</li>
          </ul>
        </Section>

        <Section title="6. Ответственность">
          <p>
            Исполнитель не несёт ответственности за убытки, возникшие
            вследствие действий третьих лиц, сбоев в работе Telegram, Google
            или платёжных систем.
          </p>
        </Section>

        <Section title="7. Расторжение договора">
          <p>
            Пользователь вправе отменить подписку в любой момент. Возврат
            средств осуществляется в соответствии с{" "}
            <a href="/refund" className="underline">
              политикой возврата
            </a>
            .
          </p>
        </Section>

        <Section title="8. Реквизиты">
          <table className="w-full mt-2">
            <tbody className="divide-y divide-gray-100">
              {[
                ["Наименование", brandName],
                ["УНП", unp],
                ["Адрес", address],
                ["Email", email],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="py-2 pr-4 text-gray-400">{label}</td>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
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
      <div>{children}</div>
    </div>
  );
}
