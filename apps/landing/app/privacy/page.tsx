import type { Metadata } from "next";
import { getCmsPage } from "@/lib/cms";
import { renderMarkdown } from "@/lib/markdown";
import { DocPageFallback } from "@/components/DocPageFallback";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Политика обработки персональных данных",
};

export default async function PrivacyPage() {
  const page = await getCmsPage("privacy");

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
          {page.title ?? "Политика конфиденциальности"}
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
    <DocPageFallback
      title="Политика конфиденциальности"
      lastUpdated="1 января 2025"
    >
      <Section title="1. Какие данные мы собираем">
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Telegram ID, имя пользователя — для идентификации.</li>
          <li>Финансовые транзакции, введённые вами в боте.</li>
          <li>Голосовые сообщения — только для распознавания текста, не сохраняются.</li>
          <li>Данные об оплате — обрабатываются платёжным шлюзом, нам не передаются.</li>
        </ul>
      </Section>

      <Section title="2. Как мы используем данные">
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Предоставление сервиса: хранение транзакций, аналитика.</li>
          <li>Синхронизация с Google Sheets (если вы её подключили).</li>
          <li>Уведомления через бот (аналитика, напоминания — с вашего согласия).</li>
        </ul>
      </Section>

      <Section title="3. Передача данных третьим лицам">
        <p>
          Мы не продаём и не передаём ваши данные третьим лицам, кроме
          случаев, необходимых для работы сервиса:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Groq / OpenAI — распознавание голоса (текст передаётся без идентификаторов).</li>
          <li>Google — если подключена Google Sheets.</li>
          <li>WebPay — обработка платежей.</li>
        </ul>
      </Section>

      <Section title="4. Хранение данных">
        <p>
          Данные хранятся на серверах в ЕС. Транзакции удаляются по запросу
          пользователя или через 90 дней после удаления аккаунта.
        </p>
      </Section>

      <Section title="5. Ваши права">
        <p>Вы вправе запросить:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Экспорт своих данных.</li>
          <li>Удаление аккаунта и всех данных.</li>
          <li>Исправление неточных данных.</li>
        </ul>
        <p className="mt-2">
          Для этого напишите на <strong>[EMAIL]</strong>.
        </p>
      </Section>

      <Section title="6. Cookies">
        <p>
          Лендинг использует только технически необходимые cookies. Аналитика
          не используется.
        </p>
      </Section>

      <Section title="7. Изменения политики">
        <p>
          О существенных изменениях сообщаем через бот. Актуальная версия
          всегда доступна на этой странице.
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
      <div>{children}</div>
    </div>
  );
}
