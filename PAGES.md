# Page Descriptions (Design Brief)

## About the Project

**Finance Bot** is a personal and family finance tracker that lives inside Telegram. Users send expenses and income to the bot as text ("130 groceries") or voice messages, and the bot automatically recognizes the amount, category and date. The bot also sends reminders, forecasts and summary reports.

The product consists of three parts:
- **Telegram bot** — the main way to enter data: type or dictate a message.
- **Mini App** — an app inside Telegram for viewing and editing expenses, analytics, tracking debts and shared events, and configuring the bot and subscription.
- **Landing site** — the marketing website: pricing, subscription payment and legal documents.

Tracking can be done alone or together with other people in a shared workspace. The model is freemium: some features (voice input, events, advanced analytics) are available only on PRO.

> The app UI is in Russian; original labels are given in parentheses where helpful.

## Part 1. Mini App (Telegram app)

**Common layout.** The app opens inside Telegram. At the bottom there is a tab bar with four tabs: Expenses (Траты), Analytics (Аналитика), Debts (Долги), Events (События). The header has buttons: Members, Help, Settings and Filters (filters only on the Expenses tab). On nested screens they are replaced with a Back button.

### 1. Expenses (main screen)
A feed of all income and expenses of the user or the shared workspace. Each entry is a card with description, amount, category, date and author (the author is shown when there are several members). A card can be opened for editing or deleted. Entries load as you scroll. If there are no entries, the screen suggests adding expenses via the bot.

**Filters panel** slides over the feed. Filters: period, type (expense or income), category, added by, currency, search by description.

### 2. Edit Expense
Form for a single entry: description, type, category, amount, currency, date. Cancel and Save buttons at the bottom.

### 3. Analytics
A report for a period: current month, previous month or custom dates. There is a filter by member. At the top is a summary: expenses, income, balance and a bar showing how much of the income has been spent. Below are a pie chart by category and a list of categories with amounts and percentages. Tapping a category opens the expenses feed already filtered by it.

### 4. Debts
Two lists: "Owed to me" (Мне должны) and "I owe" (Я должен). A debt card shows name, amount, how much has been repaid, deadline, comment. The "Add debt" button expands a form: debt direction, name, amount, currency, deadline, and linking the other person by Telegram @username. On the free plan the button may be locked (🔒).

### 5. Edit Debt
Form: name, linked @username, amount, currency, amount repaid, deadline.

### 6. Events (list)
Shared expenses of a group: a trip, a party, etc. An event card shows name, description, number of members, my spending in the event and a "settled" badge. The "Create event" button expands a form: name, description, keywords for auto-linking expenses, settlement currency. This is a paid (PRO) feature; on the free plan the button is locked.

### 7. Event Details
A header with name, description and an edit button, followed by four tabs:
- **Members** — list with each member's total spending; new members can be invited, and the creator can remove a member;
- **My expenses** — my expenses in the event; an expense can be linked, excluded from the settlement or deleted;
- **All expenses** — expenses of all members;
- **Settlement** — who owes whom and how much after settling up.

### 8. Members Modal
Managing the shared workspace: add a person by @username and grant access to expenses and/or analytics. Members show "owner" and "paused" statuses.

### 9. Upgrade Modal
Shown when trying to use a paid feature. Offers an upgrade to PRO.

### 10. Settings (menu)
A list of sections, each with a chevron: Expenses, Analytics, Subscription, Help, Contacts. Admins additionally see four internal sections (items 16–19).

### 11. Settings → Expenses
Default currency, exporting expenses to a file, and managing custom categories: add, rename, delete, set a description of what belongs in each.

### 12. Settings → Analytics
How the bot communicates with the user: time zone, bot personality (message tone). Also toggles for automatic messages: end-of-day reminder, Sunday forecast, end-of-month report.

### 13. Settings → Subscription
Current plan, expiry date and the list of features included in the plan. "Change plan" and "Cancel subscription" buttons; cancellation requires confirmation.

### 14. Help
Instructions on how to use the bot and the app.

### 15. Contacts
Support email and Telegram, both clickable.

### Internal pages (admin only)

**16. App Statistics.** Users for a selected period: total, active, inactive, empty. Daily dynamics, bot archive, subscription notifications.

**17. bePaid Subscriptions.** A table of payments and subscriptions from the payment provider: plan, creation date, active until, last charge.

**18. Message from the Bot.** Send text on behalf of the bot to a single user or to everyone. After sending, it shows who the message was not delivered to.

**19. Gift a Subscription.** Search for a user, choose a period and grant a subscription without payment. The user receives a gift notification.

## Part 2. Landing Site

**1. Home.** The bot's sales page: hero with the offer, benefits (voice input, text input, analytics), a "how it works" section, and a call to action to start in Telegram.

**2. Pricing.** Comparison of Free, Pro (monthly) and Pro Year plans, with the popular one highlighted. Plan selection buttons.

**3. Subscribe (checkout).** Users arrive here from the bot. They see their current status, choose a plan and proceed to payment. Internal page, not indexed by search engines.

**4. Payment Successful** and **5. Payment Failed.** Payment result screens: a status message and a button to return to the bot or retry the payment.

**6. FAQ.** A list of questions and answers about the bot.

**7. Payment.** Subscription payment methods.

**8. Contacts.** Support contacts and company details.

**9–11. Legal pages:** public offer, privacy policy, refund policy. Text documents with a title and last-updated date, all using the same template.
