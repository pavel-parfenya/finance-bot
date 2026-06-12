import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
    icon: "🌍",
    title: "Любая валюта",
    description: "BYN, USD, EUR, RUB и ещё 5 валют с автоконвертацией.",
  },
  {
    icon: "⚡",
    title: "Мгновенно",
    description: "Запись траты занимает пару секунд — никаких таблиц и форм.",
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

const STEPS = [
  {
    title: "Скажите о трате",
    description:
      "Голосом или текстом, своими словами: «потратил 30 на обед». Без категорий и кнопок.",
  },
  {
    title: "Бот всё распознаёт",
    description:
      "AI определяет сумму, категорию и валюту, записывает транзакцию за пару секунд.",
  },
  {
    title: "Смотрите аналитику",
    description:
      "Отчёты по категориям, динамика и прогнозы — всё прямо в чате, когда понадобится.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getCmsHomePage(),
    getCmsSiteSettings(),
  ]);
  const brandName = settings?.companyName ?? "[BRAND_NAME]";
  const seoTitle =
    page?.seoTitle?.replaceAll("[BRAND_NAME]", brandName) ??
    `${brandName} — учёт расходов голосом`;
  return {
    title: seoTitle,
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

  const brandName = settings?.companyName ?? "Бухгалтер Валентин";
  const logoSrc = settings?.logoUrl ?? "/valentin.png";
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brandName,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Telegram",
    description:
      "Telegram-бот для учёта финансов с распознаванием голосовых сообщений",
    url: "https://valentinethebuhgalter.by",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-200/60">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(63,67,184,0.20), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left */}
            <div className="animate-float-up text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/60 px-3.5 py-1.5 text-sm font-medium text-accent-dark">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                {heroBadgeText}
              </div>

              <h1 className="mt-7 text-5xl font-semibold leading-[1.05] tracking-tight text-neutral-900 md:text-6xl lg:text-[4.25rem]">
                {heroTitle}
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-600 lg:mx-0">
                {heroSubtitle}
              </p>

              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start sm:justify-center">
                <a
                  href={botLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-lift transition-all hover:bg-neutral-800 hover:-translate-y-0.5 sm:w-auto"
                >
                  {heroPrimaryCtaText}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                  </svg>
                </a>
                <Link
                  href="/pricing"
                  className="inline-flex w-full items-center justify-center rounded-full border border-neutral-300 bg-white/70 px-7 py-3.5 text-sm font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-white sm:w-auto"
                >
                  {heroSecondaryCtaText}
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-neutral-500 lg:justify-start">
                <span className="inline-flex items-center gap-2">
                  <CheckIcon /> Бесплатный тариф
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckIcon /> Без регистрации
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckIcon /> 9 валют
                </span>
              </div>
            </div>

            {/* Right — Telegram demo */}
            <div className="animate-float-up [animation-delay:120ms] flex justify-center lg:justify-end">
              <PhoneDemo
                brandName={brandName}
                logoSrc={logoSrc}
                messages={demoMessages}
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-dark">
            Как это работает
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900">
            Три шага — и трата записана
          </h2>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-neutral-200/70 bg-white p-8 shadow-soft transition-transform hover:-translate-y-1"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-lg font-semibold text-gold">
                {i + 1}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-neutral-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Persona */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-12 md:px-14 md:py-16">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(212,175,106,0.35), transparent 65%)",
            }}
          />
          <div className="relative grid items-center gap-10 md:grid-cols-[auto_1fr]">
            <div className="mx-auto md:mx-0">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-gold/20 blur-xl" />
                <Image
                  src={logoSrc}
                  alt={brandName}
                  width={200}
                  height={200}
                  className="relative h-40 w-40 rounded-full object-cover ring-4 ring-gold/40 md:h-52 md:w-52"
                />
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm font-semibold uppercase tracking-wider text-gold">
                Ваш личный бухгалтер
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-4xl">
                Познакомьтесь с&nbsp;{brandName}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-neutral-300 md:mx-0">
                Сосредоточен, всегда на связи и считает каждую копейку. Отправьте
                ему голосовое или сообщение — он распознает трату, разложит по
                категориям и не даст бюджету разойтись.
              </p>
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-ink transition-all hover:bg-gold-soft hover:-translate-y-0.5"
              >
                Написать {brandName}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-neutral-200/60 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-neutral-900">
              {featuresTitle}
            </h2>
            <p className="mt-4 text-lg text-neutral-600">{featuresSubtitle}</p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-200/70 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group bg-white p-8 transition-colors hover:bg-accent-soft/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft/60 text-2xl transition-transform group-hover:scale-110">
                  {f.icon}
                </div>
                <h3 className="mt-5 font-semibold text-neutral-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          className="pointer-events-none absolute -bottom-32 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,106,0.35), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-neutral-300">
            {ctaSubtitle}
          </p>
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-sm font-semibold text-ink shadow-lift transition-all hover:bg-gold-soft hover:-translate-y-0.5"
          >
            {ctaButtonText}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
            </svg>
          </a>
        </div>
      </section>
    </>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0 text-accent-dark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PhoneDemo({
  brandName,
  logoSrc,
  messages,
}: {
  brandName: string;
  logoSrc: string;
  messages: CmsDemoMessage[];
}) {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-b from-accent/20 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-white shadow-lift">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-neutral-100 bg-white px-5 py-3.5">
          <Image
            src={logoSrc}
            alt={brandName}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">
              {brandName}
            </p>
            <p className="flex items-center gap-1 text-xs text-accent-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              онлайн
            </p>
          </div>
        </div>
        {/* Messages */}
        <div className="space-y-3 bg-[#f4f6f5] px-4 py-5">
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              text={msg.text}
              isVoice={msg.isVoice}
            />
          ))}
        </div>
        {/* Input bar */}
        <div className="flex items-center gap-2 border-t border-neutral-100 bg-white px-4 py-3">
          <div className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-xs text-neutral-400">
            Сообщение…
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
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
        className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "rounded-br-md bg-accent text-white"
            : "rounded-bl-md bg-white text-neutral-800"
        }`}
      >
        {isVoice && (
          <span className="mb-1 inline-flex items-center gap-1.5 text-xs opacity-80">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
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
