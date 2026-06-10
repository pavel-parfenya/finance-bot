import { createStrapi } from "@strapi/strapi";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const FAQS = [
  {
    question: "Как работает распознавание голосовых сообщений?",
    answer:
      "Бот принимает голосовое сообщение, отправляет его на распознавание речи (Whisper AI), затем AI-модель разбирает текст и извлекает сумму, валюту и категорию. Всё происходит за несколько секунд.",
    sortOrder: 0,
  },
  {
    question: "Нужно ли говорить в определённом формате?",
    answer:
      "Нет. Говорите как обычно: «потратила 50 рублей на продукты», «заправила машину на 80», «купила кофе за 8.50». Бот сам разберёт смысл.",
    sortOrder: 1,
  },
  {
    question: "Где хранятся мои данные?",
    answer:
      "Транзакции хранятся в нашей базе данных. Голосовые сообщения не сохраняются — используются только для распознавания.",
    sortOrder: 2,
  },
  {
    question: "Можно ли вести учёт вместе с партнёром или семьёй?",
    answer:
      "Да. В тарифе Pro доступны общие пространства: все участники видят общие траты, каждый добавляет свои.",
    sortOrder: 3,
  },
  {
    question: "Что такое тариф Free и чем он отличается от Pro?",
    answer:
      "Free — текстовый ввод трат, базовая аналитика. Pro добавляет голосовые сообщения, AI-распознавание, расширенную аналитику, прогнозы и совместный учёт.",
    sortOrder: 4,
  },
  {
    question: "Как отменить подписку?",
    answer:
      "Отменить подписку можно в любой момент через бот: раздел «Настройки» → «Подписка» → «Отменить». Оставшееся оплаченное время сохраняется.",
    sortOrder: 5,
  },
  {
    question: "Есть ли возврат средств?",
    answer:
      "Да, мы принимаем заявки на возврат в течение 14 дней с момента оплаты, если услуга не была использована. Подробности — в политике возврата.",
    sortOrder: 6,
  },
];

const PRICING_PLANS = [
  {
    name: "Free",
    planId: "free",
    price: 0,
    period: null,
    description: "Для старта",
    features: ["Текстовый ввод трат", "Базовая аналитика", "1 пространство"],
    featureKeys: [],
    isPopular: false,
    ctaText: "Начать бесплатно",
    sortOrder: 0,
  },
  {
    name: "Pro",
    planId: "pro_month",
    price: null,
    period: "month",
    description: "Для тех, кто ценит время",
    features: [
      "Всё из Free",
      "Голосовые сообщения",
      "Аналитика",
      "Прогнозы трат",
      "Долги",
      "Совместный бюджет",
    ],
    featureKeys: [
      "voice_input",
      "advanced_analytics",
      "forecasts",
      "debts",
      "collaborative",
    ],
    isPopular: true,
    ctaText: "Выбрать Pro",
    sortOrder: 1,
  },
  {
    name: "Pro Year",
    planId: "pro_year",
    price: null,
    period: "year",
    description: "Выгоднее",
    features: ["Всё из Pro", "Скидка по сравнению с месячным"],
    featureKeys: [
      "voice_input",
      "advanced_analytics",
      "forecasts",
      "debts",
      "collaborative",
    ],
    isPopular: false,
    ctaText: "Выбрать годовой",
    sortOrder: 2,
  },
];

/** Каталог фич (коллекция Feature). `key` совпадает с FeatureKey в коде (гейтинг). */
const FEATURES = [
  { key: "voice_input", label: "Голосовые сообщения", sortOrder: 0 },
  { key: "advanced_analytics", label: "Аналитика", sortOrder: 1 },
  { key: "forecasts", label: "Прогнозы трат", sortOrder: 2 },
  { key: "debts", label: "Долги", sortOrder: 3 },
  { key: "collaborative", label: "Совместный бюджет", sortOrder: 4 },
];

const HOME_PAGE = {
  heroBadgeText: "Доступно в Telegram",
  heroTitle: "Учёт расходов голосом",
  heroSubtitle:
    "Telegram-бот распознаёт голосовые сообщения и автоматически записывает ваши траты. Никаких форм — просто говорите.",
  heroPrimaryCtaText: "Попробовать бесплатно",
  heroSecondaryCtaText: "Посмотреть тарифы",
  featuresTitle: "Всё что нужно для учёта",
  featuresSubtitle: "Без лишних шагов — работает прямо в Telegram",
  features: [
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
  ],
  demoMessages: [
    { role: "user", text: "🎙 потратила 47 рублей на продукты", isVoice: true },
    { role: "bot", text: "✅ Записано: −47.00 BYN · Продукты · сегодня" },
    { role: "user", text: "🎙 купила кофе за 8.50, это кафе", isVoice: true },
    { role: "bot", text: "✅ Записано: −8.50 BYN · Кафе и рестораны · сегодня" },
    { role: "user", text: "аналитика за месяц" },
    {
      role: "bot",
      text: "📊 Ноябрь: 847.30 BYN\nПродукты — 312 BYN\nТранспорт — 95 BYN\nКафе — 184 BYN",
    },
  ],
  ctaTitle: "Начните прямо сейчас",
  ctaSubtitle: "Бесплатный тариф доступен без регистрации",
  ctaButtonText: "Открыть в Telegram",
  seoTitle: "[BRAND_NAME] — учёт расходов голосом",
  seoDescription:
    "Telegram-бот для учёта финансов с распознаванием голосовых сообщений. Скажите о трате — бот запишет.",
};

const PAGES = [
  {
    title: "Политика конфиденциальности",
    slug: "privacy",
    seoTitle: "Политика конфиденциальности",
    seoDescription: "Политика обработки персональных данных",
    lastUpdated: "2025-01-01",
    content: `## 1. Какие данные мы собираем

- Telegram ID, имя пользователя — для идентификации.
- Финансовые транзакции, введённые вами в боте.
- Голосовые сообщения — только для распознавания текста, не сохраняются.
- Данные об оплате — обрабатываются платёжным шлюзом, нам не передаются.

## 2. Как мы используем данные

- Предоставление сервиса: хранение транзакций, аналитика.
- Уведомления через бот (аналитика, напоминания — с вашего согласия).

## 3. Передача данных третьим лицам

Мы не продаём и не передаём ваши данные третьим лицам, кроме случаев, необходимых для работы сервиса:

- Groq / OpenAI — распознавание голоса (текст передаётся без идентификаторов).
- WebPay — обработка платежей.

## 4. Хранение данных

Данные хранятся на серверах в ЕС. Транзакции удаляются по запросу пользователя или через 90 дней после удаления аккаунта.

## 5. Ваши права

Вы вправе запросить:

- Экспорт своих данных.
- Удаление аккаунта и всех данных.
- Исправление неточных данных.

Для этого напишите на **[EMAIL]**.

## 6. Cookies

Лендинг использует только технически необходимые cookies. Аналитика не используется.

## 7. Изменения политики

О существенных изменениях сообщаем через бот. Актуальная версия всегда доступна на этой странице.`,
  },
  {
    title: "Публичная оферта",
    slug: "offer",
    seoTitle: "Публичная оферта",
    seoDescription: "Публичный договор оферты на оказание услуг",
    lastUpdated: "2025-01-01",
    content: `## 1. Общие положения

Настоящий документ является публичной офертой [BRAND_NAME] (далее — «Исполнитель», УНП: [UNP]) и содержит условия оказания услуг доступа к Telegram-боту для учёта финансов.

Акцептом настоящей оферты является оплата подписки через платёжный шлюз. С момента оплаты договор считается заключённым.

## 2. Предмет договора

Исполнитель предоставляет Пользователю доступ к программному обеспечению (Telegram-бот), включающему:

- Распознавание голосовых сообщений с описанием трат.
- Хранение и категоризацию финансовых транзакций.
- Аналитику и отчёты по расходам.

## 3. Стоимость и порядок оплаты

Стоимость подписки определяется актуальным тарифным планом, опубликованным на странице [/pricing](/pricing). Оплата производится в белорусских рублях (BYN) через платёжный шлюз WebPay.

## 4. Срок действия подписки

Подписка действует в течение оплаченного периода (месяц или год). При включённом автопродлении списание происходит в дату окончания текущего периода.

## 5. Права и обязанности сторон

Исполнитель обязуется:

- Обеспечить доступность сервиса не менее 95% времени в месяц.
- Уведомлять о плановых технических работах не менее чем за 24 часа.
- Хранить данные Пользователя в соответствии с политикой конфиденциальности.

Пользователь обязуется:

- Не использовать сервис для незаконных целей.
- Не передавать доступ третьим лицам.

## 6. Ответственность

Исполнитель не несёт ответственности за убытки, возникшие вследствие действий третьих лиц, сбоев в работе Telegram, Google или платёжных систем.

## 7. Расторжение договора

Пользователь вправе отменить подписку в любой момент. Возврат средств осуществляется в соответствии с [политикой возврата](/refund).

## 8. Реквизиты

| Поле | Значение |
|---|---|
| Наименование | [BRAND_NAME] |
| УНП | [UNP] |
| Адрес | [ADDRESS] |
| Email | [EMAIL] |`,
  },
  {
    title: "Политика возврата",
    slug: "refund",
    seoTitle: "Политика возврата",
    seoDescription: "Условия возврата денежных средств",
    lastUpdated: "2025-01-01",
    content: `## 1. Право на возврат

Вы вправе потребовать возврат денежных средств в течение **14 (четырнадцати) календарных дней** с момента оплаты подписки при условии, что услуга не была использована или была использована в минимальном объёме (не более 3 транзакций).

## 2. Процедура возврата

Для оформления возврата необходимо:

1. Направить заявку на [[EMAIL]](/contacts) с темой «Возврат средств».
2. Указать: дату оплаты, сумму, номер транзакции (из уведомления об оплате), причину возврата.
3. Дождаться подтверждения — обрабатываем в течение 3 рабочих дней.

## 3. Срок зачисления

После одобрения возврат зачисляется на карту в течение 5–10 рабочих дней в зависимости от банка-эмитента.

## 4. Исключения

Возврат не производится в случае:

- Прошло более 14 дней с момента оплаты.
- Услуга была использована в полном объёме.
- Подписка была отменена пользователем и использована до конца периода.

## 5. Контакты

По вопросам возврата: [[EMAIL]](/contacts)`,
  },
  {
    title: "Оплата",
    slug: "payment",
    seoTitle: "Оплата",
    seoDescription: "Способы оплаты подписки",
    lastUpdated: null,
    content: `Подписка оформляется в боте. Оплата проходит через защищённый платёжный шлюз WebPay.

## Способы оплаты

- Банковские карты Visa, MasterCard, Белкарт
- Интернет-банкинг белорусских банков
- Рекуррентные списания (автопродление)

## Автопродление

По умолчанию подписка продлевается автоматически. За 3 дня до списания придёт уведомление в боте. Отключить автопродление можно в настройках подписки в любой момент.

## Валюта и безопасность

Оплата принимается в белорусских рублях (BYN). Все транзакции обрабатываются через сертифицированный платёжный шлюз WebPay. Данные карты не хранятся на наших серверах.

---

Возникли вопросы по оплате? [Напишите нам](/contacts) или ознакомьтесь с [политикой возврата](/refund).`,
  },
];

async function seed() {
  const appDir = path.resolve(__dirname, "../..");
  const app = await createStrapi({ appDir }).load();

  try {
    console.log("Seeding FAQs...");
    const existingFaqs = await app.documents("api::faq.faq").findMany({});
    if (existingFaqs.length === 0) {
      for (const faq of FAQS) {
        await app.documents("api::faq.faq").create({
          data: faq,
          status: "published",
        });
      }
      console.log(`  Created ${FAQS.length} FAQs`);
    } else {
      console.log(`  Skipped — ${existingFaqs.length} FAQs already exist`);
    }

    console.log("Seeding Features...");
    const featureIdByKey = new Map<string, string>();
    const existingFeatures = await app.documents("api::feature.feature").findMany({});
    if (existingFeatures.length === 0) {
      for (const feature of FEATURES) {
        const created = await app.documents("api::feature.feature").create({
          data: feature,
        });
        featureIdByKey.set(feature.key, created.documentId);
      }
      console.log(`  Created ${FEATURES.length} features`);
    } else {
      for (const f of existingFeatures) {
        if (typeof f.key === "string") featureIdByKey.set(f.key, f.documentId);
      }
      console.log(`  Skipped — ${existingFeatures.length} features already exist`);
    }

    console.log("Seeding Pricing plans...");
    const existingPlans = await app.documents("api::pricing.pricing").findMany({});

    if (existingPlans.length === 0) {
      for (const plan of PRICING_PLANS) {
        const { featureKeys, ...planData } = plan;
        const connect = (featureKeys ?? [])
          .map((k) => featureIdByKey.get(k))
          .filter((id): id is string => Boolean(id));
        await app.documents("api::pricing.pricing").create({
          data: {
            ...planData,
            planFeatures: { connect },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          status: "published",
        });
      }
      console.log(`  Created ${PRICING_PLANS.length} pricing plans`);
    } else {
      console.log(`  Skipped — ${existingPlans.length} plans already exist`);
    }

    console.log("Seeding Home Page...");
    const existingHome = await app.documents("api::home-page.home-page").findFirst({});
    if (!existingHome) {
      await app.documents("api::home-page.home-page").create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: HOME_PAGE as any,
        status: "published",
      });
      console.log("  Created home page");
    } else {
      await app.documents("api::home-page.home-page").update({
        documentId: existingHome.documentId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: HOME_PAGE as any,
        status: "published",
      });
      console.log("  Updated home page");
    }

    console.log("Seeding Pages...");
    for (const page of PAGES) {
      const existing = await app
        .documents("api::page.page")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .findFirst({ filters: { slug: page.slug } } as any);
      if (!existing) {
        await app.documents("api::page.page").create({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: page as any,
          status: "published",
        });
        console.log(`  Created page: ${page.slug}`);
      } else {
        await app.documents("api::page.page").update({
          documentId: existing.documentId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: page as any,
          status: "published",
        });
        console.log(`  Updated page: ${page.slug}`);
      }
    }

    console.log("\nSeed complete!");
  } finally {
    await app.destroy();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
