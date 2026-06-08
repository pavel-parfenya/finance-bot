import type { Metadata } from "next";
import { getCmsFaqs } from "@/lib/cms";
import type { CmsFaq } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Частые вопросы",
  description: "Ответы на частые вопросы о боте",
};

const FALLBACK_FAQS: CmsFaq[] = [
  {
    id: 1,
    question: "Как работает распознавание голосовых сообщений?",
    answer:
      "Бот принимает голосовое сообщение, отправляет его на распознавание речи (Whisper AI), затем AI-модель разбирает текст и извлекает сумму, валюту и категорию. Всё происходит за несколько секунд.",
    sortOrder: 0,
  },
  {
    id: 2,
    question: "Нужно ли говорить в определённом формате?",
    answer:
      "Нет. Говорите как обычно: «потратила 50 рублей на продукты», «заправила машину на 80», «купила кофе за 8.50». Бот сам разберёт смысл.",
    sortOrder: 1,
  },
  {
    id: 3,
    question: "Где хранятся мои данные?",
    answer:
      "Транзакции хранятся в нашей базе данных и автоматически синхронизируются с вашей Google Таблицей. Голосовые сообщения не сохраняются — используются только для распознавания.",
    sortOrder: 2,
  },
  {
    id: 4,
    question: "Можно ли вести учёт вместе с партнёром или семьёй?",
    answer:
      "Да. В тарифе Pro доступны общие пространства: все участники видят общие траты, каждый добавляет свои.",
    sortOrder: 3,
  },
  {
    id: 5,
    question: "Что такое тариф Free и чем он отличается от Pro?",
    answer:
      "Free — текстовый ввод трат, базовая аналитика. Pro добавляет голосовые сообщения, AI-распознавание, расширенную аналитику, прогнозы и совместный учёт.",
    sortOrder: 4,
  },
  {
    id: 6,
    question: "Как отменить подписку?",
    answer:
      "Отменить подписку можно в любой момент через бот: раздел «Настройки» → «Подписка» → «Отменить». Оставшееся оплаченное время сохраняется.",
    sortOrder: 5,
  },
  {
    id: 7,
    question: "Есть ли возврат средств?",
    answer:
      "Да, мы принимаем заявки на возврат в течение 14 дней с момента оплаты, если услуга не была использована. Подробности — в политике возврата.",
    sortOrder: 6,
  },
];

export default async function FaqPage() {
  const rawFaqs = await getCmsFaqs();
  const faqs = rawFaqs.length > 0 ? rawFaqs : FALLBACK_FAQS;

  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Частые вопросы</h1>
        <p className="text-gray-500">Не нашли ответ? Напишите нам — ответим быстро.</p>
      </div>

      <div className="divide-y divide-gray-100">
        {faqs.map((item) => (
          <details key={item.id} className="group py-5">
            <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
              <span className="font-medium text-gray-900">{item.question}</span>
              <svg
                className="w-5 h-5 flex-shrink-0 text-gray-400 group-open:rotate-180 transition-transform mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
