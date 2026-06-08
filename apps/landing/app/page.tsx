import type { Metadata } from "next";
import Link from "next/link";
import { getCmsHomePage, getCmsSiteSettings } from "@/lib/cms";
import type { CmsFeature, CmsDemoMessage } from "@/lib/cms";

const DEFAULT_FEATURES: CmsFeature[] = [
  {
    icon: "🎙️",
    title: "Голосовые сообщения",
    description:
      "Просто отправьте голосовое «потратил 50 рублей на кофе» — бот распознает и запишет.",
  },
  {
    icon: "📊",
    title: "Аналитика",
    description: "Отчёты по категориям, динамика трат, прогнозы на месяц.",
  },
  {
    icon: "💬",
    title: "Текстом и цифрами",
    description: "Принимает сообщения в любом формате: «130 продукты», «-500 такси».",
  },
  {
    icon: "👥",
    title: "Совместный учёт",
    description: "Семья или партнёры — одно пространство для всех.",
  },
  {
    icon: "🔄",
    title: "Google Sheets",
    description: "Все данные автоматически попадают в вашу таблицу.",
  },
  {
    icon: "🌍",
    title: "Любая валюта",
    description: "BYN, USD, EUR, RUB и ещё 5 валют с автоконвертацией.",
  },
];

const DEFAULT_DEMO_MESSAGES: CmsDemoMessage[] = [
  { role: "user", text: "🎙 потратила 47 рублей на продукты", isVoice: true },
  { role: "bot", text: "✅ Записано: −47.00 BYN · Продукты · сегодня" },
  { role: "user", text: "🎙 купила кофе за 8.50, это кафе", isVoice: true },
  { role: "bot", text: "✅ Записано: −8.50 BYN · Кафе и рестораны · сегодня" },
  { role: "user", text: "аналитика за месяц" },
  {
    role: "bot",
    text: "📊 Ноябрь: 847.30 BYN\nПродукты — 312 BYN\nТранспорт — 95 BYN\nКафе — 184 BYN",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCmsHomePage();
  return {
    title: page?.seoTitle ?? "[BRAND_NAME] — учёт расходов голосом",
    description:
      page?.seoDescription ??
      "Telegram-бот для учёта финансов с распознаванием голосовых сообщений.",
  };
}

export default async function HomePage() {
  const [page, settings] = await Promise.all([
    getCmsHomePage(),
    getCmsSiteSettings(),
  ]);

  const botLink = settings?.botUsername
    ? `https://t.me/${settings.botUsername}`
    : "https://t.me/valentinethebuhgalter_bot";

  const heroBadgeText = page?.heroBadgeText ?? "Доступно в Telegram";
  const heroTitle = page?.heroTitle ?? "Учёт расходов голосом";
  const heroSubtitle =
    page?.heroSubtitle ??
    "Telegram-бот распознаёт голосовые сообщения и автоматически записывает ваши траты. Никаких форм — просто говорите.";
  const heroPrimaryCtaText = page?.heroPrimaryCtaText ?? "Попробовать бесплатно";
  const heroSecondaryCtaText = page?.heroSecondaryCtaText ?? "Посмотреть тарифы";
  const featuresTitle = page?.featuresTitle ?? "Всё что нужно для учёта";
  const featuresSubtitle =
    page?.featuresSubtitle ?? "Без лишних шагов — работает прямо в Telegram";
  const features: CmsFeature[] =
    Array.isArray(page?.features) && page.features.length > 0
      ? page.features
      : DEFAULT_FEATURES;
  const demoMessages: CmsDemoMessage[] =
    Array.isArray(page?.demoMessages) && page.demoMessages.length > 0
      ? page.demoMessages
      : DEFAULT_DEMO_MESSAGES;
  const ctaTitle = page?.ctaTitle ?? "Начните прямо сейчас";
  const ctaSubtitle =
    page?.ctaSubtitle ?? "Бесплатный тариф доступен без регистрации";
  const ctaButtonText = page?.ctaButtonText ?? "Открыть в Telegram";

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-500 mb-8">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          {heroBadgeText}
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-tight">
          {heroTitle}
        </h1>

        <p className="text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          {heroSubtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
          >
            {heroPrimaryCtaText}
          </a>
          <Link
            href="/pricing"
            className="rounded-md border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
          >
            {heroSecondaryCtaText}
          </Link>
        </div>
      </section>

      {/* Demo */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
              <span className="ml-2 text-xs text-gray-400">Telegram</span>
            </div>
            <div className="space-y-3">
              {demoMessages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} text={msg.text} isVoice={msg.isVoice} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          {featuresTitle}
        </h2>
        <p className="text-center text-gray-500 mb-16">{featuresSubtitle}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">{ctaTitle}</h2>
          <p className="text-gray-400 mb-8 text-lg">{ctaSubtitle}</p>
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-white px-8 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {ctaButtonText}
          </a>
        </div>
      </section>
    </>
  );
}

function ChatMessage({
  role,
  text,
  isVoice,
}: {
  role: "user" | "bot";
  text: string;
  isVoice?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? "bg-blue-500 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-800 rounded-bl-sm"
        }`}
      >
        {isVoice && (
          <span className="inline-flex items-center gap-1 text-xs opacity-80 mb-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            Голосовое сообщение
          </span>
        )}
        {isVoice && <br />}
        {text}
      </div>
    </div>
  );
}
