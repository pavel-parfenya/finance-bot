Этап 1. Миграция проекта на Turborepo

Цель: привести проект к финальной структуре.

Итоговая структура
finance-platform
├── apps
│   ├── api
│   ├── bot
│   ├── miniapp
│   ├── landing
│   └── cms
│
├── packages
│   ├── shared-types
│   ├── shared-utils
│   ├── ui
│   └── eslint-config
│
├── docker
├── turbo.json
└── package.json
Задача для Claude Code
Шаг 1

Создать Turborepo.

Шаг 2

Перенести:

apps/api
apps/bot
apps/client -> apps/miniapp
Шаг 3

Настроить:

turbo dev
turbo build
turbo lint
Этап 2. Подготовка доменной модели подписок

Сейчас у тебя есть Subscription Entity.

Но скорее всего она слишком простая.

Нужно расширить.

Subscription
export enum SubscriptionPlan {
FREE,
PRO_MONTH,
PRO_YEAR,
}
export enum SubscriptionStatus {
ACTIVE,
CANCELED,
EXPIRED,
PAST_DUE,
}
Subscription {
id
userId

plan
status

startsAt
expiresAt

recurringToken

webpayOrderId
webpayRecurringId

createdAt
updatedAt
}
Задача Claude

Создать полноценную billing-модель.

Без WebPay.

Просто подготовить сущности.

Этап 3. Лендинг

Цель:

Получить сайт, который пройдет проверку банка.

Судя по PDF, банк требует:

контакты
описание услуги
тарифы
возвраты
оплата
реквизиты
политика обработки данных

Создать приложение
apps/landing

Stack:

Next.js
Tailwind
TypeScript
Страницы
/
pricing
faq
contacts
payment
refund
privacy
offer
Этап 4. CMS

Я бы выбрала Strapi.

Не потому что он лучше Directus.

А потому что Claude Code умеет писать код для Strapi значительно лучше.

Создать приложение
apps/cms

Strapi v5.

Content Types
Page
title
slug
content
seoTitle
seoDescription
FAQ
question
answer
sortOrder
Pricing
name
price
description
features
SiteSettings
companyName
unp
email
phone
address
Этап 5. Интеграция CMS → Landing

Цель:

Любой текст меняется без деплоя.

Claude должен сделать:

landing
↓
Strapi API
↓
SSR

Например:

GET /api/page/home
Этап 6. Telegram авторизация на лендинге

Самый важный этап.

Никаких логинов.

Никаких паролей.

Сценарий

Бот:

Купить подписку

↓

Открывает:

https://valentinethebuhgalter.by/subscribe

с JWT.

JWT:

{
"telegramId": 123456
}

Landing:

читает JWT
↓
запрашивает пользователя
↓
показывает тарифы
Этап 7. Billing Module

Создать модуль:

apps/api/src/modules/billing

Сервисы

BillingService
SubscriptionService
RecurringPaymentService

Контроллеры

POST /billing/checkout
POST /billing/webhook
POST /billing/cancel
POST /billing/change-plan
GET  /billing/subscription
Этап 8. WebPay интеграция

Только после завершения предыдущих этапов.

Реализовать:

Создание платежа
createCheckout()

↓

WebPay

↓

redirect_url

Callback
/webpay/callback
Success
/webpay/success
Fail
/webpay/fail
Этап 9. Mini App раздел "Подписка"

Создать новый раздел.

Подписка

Отображать:

Тариф

Статус

Дата следующего списания

История платежей

Кнопки:

Изменить тариф
Отменить подписку
Этап 10. Админка подписок

В Strapi создать:

Users

Просмотр пользователей.

Subscriptions

Просмотр подписок.

Payments

История платежей.

Этап 11. SEO

Для лендинга:

sitemap.xml
robots.txt
OpenGraph
JSON-LD
Этап 12. Инфраструктура

Docker Compose.

nginx
api
bot
miniapp
landing
cms
postgres
redis
Какой порядок я бы дала Claude Code

Не всё сразу.

Спринтами.

Sprint 1
Turborepo
Landing
Strapi
Sprint 2
CMS интеграция
SEO
Контент
Sprint 3
Billing Module
Subscription Entity
Sprint 4
WebPay
Sprint 5
Mini App подписки
Sprint 6
Админка платежей

Такой порядок минимизирует риск, потому что WebPay обычно занимает 10–20% времени, а подготовка архитектуры и контента для прохождения проверки банка — остальные 80%. Судя по требованиям из PDF, именно наличие корректного сайта и документов будет первым блокером подключения эквайринга, а не сам код платежей.
