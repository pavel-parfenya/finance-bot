# Finance Bot

Telegram bot that accepts text or voice messages describing expenses, parses them with DeepSeek, and logs structured data to a Google Sheet.

## Architecture

```
src/
├── domain/           # Models & interfaces — zero dependencies
│   ├── models/       # Expense value object, ExpenseCategory enum
│   └── interfaces/   # IExpenseRepository, IMessageParser, ISpeechRecognizer
├── infrastructure/   # Concrete implementations (depend on domain)
│   ├── deepseek/     # DeepSeek LLM message parser
│   ├── whisper/      # Whisper-compatible speech recognizer (Groq, OpenAI, etc.)
│   └── google-sheets/# Google Sheets expense repository
├── services/         # Application layer — orchestrates domain + infra
├── bot/              # Telegram presentation layer (grammY)
│   └── handlers/     # Text & voice message handlers
├── di/               # Composition root — wires everything together
└── config/           # Environment-based configuration
```

**SOLID principles applied:**
- **S** — each class has a single responsibility (parsing, recognition, storage, orchestration)
- **O** — new parsers/repositories can be added without modifying existing code
- **L** — all implementations are substitutable through their interfaces
- **I** — small, focused interfaces (`IMessageParser`, `ISpeechRecognizer`, `IExpenseRepository`)
- **D** — services depend on abstractions (interfaces), not concrete implementations

## Prerequisites

- Node.js 18+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- DeepSeek API key (from [platform.deepseek.com](https://platform.deepseek.com/))
- Whisper STT API key — [Groq](https://console.groq.com/) (free) or OpenAI
- Google Cloud service account with Sheets API enabled

## Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. **Включите оба API** (APIs & Services → Library):
   - **Google Sheets API**
   - **Google Drive API** (нужен для создания новых таблиц и выдачи доступа)
4. Create a **Service Account** and download the JSON key
5. Copy the `client_email` and `private_key` from the JSON key
6. Для привязки своей таблицы: откройте её → «Поделиться» → добавьте email сервисного аккаунта как редактора

## Setup

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
```

Fill in your `.env`:

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `DEEPSEEK_API_KEY` | Your DeepSeek API key |
| `WHISPER_API_KEY` | API key for the Whisper STT provider |
| `WHISPER_BASE_URL` | STT endpoint (default: `https://api.groq.com/openai/v1`) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID from your Google Sheet URL |
| `GOOGLE_SHEETS_WORKSHEET_NAME` | Sheet tab name (default: `Expenses`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Private key from service account JSON |

## Run

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

## Инструкция для пользователей бота

Бот доступен по команде **/help** в Telegram. Краткая версия:

### Как начать

Можно сразу отправлять текстовые или голосовые сообщения о тратах — они сохраняются в базу данных. Таблицу можно подключить позже.

### Как создать таблицу

1. Нажмите кнопку «Создать таблицу» в /start
2. Или перейдите на [sheets.new](https://sheets.new) и создайте таблицу вручную
3. Таблица откроется в Google Sheets

### Как добавить бота в таблицу

1. Откройте вашу таблицу в Google Sheets
2. Нажмите «Настройки доступа» (или «Поделиться»)
3. В поле «Добавить пользователей» вставьте **email бота** (показан в /start и /help)
4. Выберите роль **«Редактор»**
5. Нажмите «Готово»

### Как подключить таблицу к боту

После добавления бота в таблицу отправьте команду:

```
/link https://docs.google.com/spreadsheets/d/ВАШ_ID/edit
```

Ссылку скопируйте из адресной строки браузера при открытой таблице.

### Что происходит с тратами до подключения таблицы

Все траты сохраняются в базу. Когда вы подключите таблицу через /link, все ранее сохранённые записи автоматически перенесутся в неё.

### Команды

| Команда | Описание |
|---------|----------|
| /start | Главное меню |
| /help | Подробная инструкция |
| /link | Подключить таблицу |
| /invite @username | Пригласить участника (только для владельца) |

### Примеры сообщений о тратах

- «Купил 3 пачки яиц за 5 BYN в Евроопте»
- «Такси в аэропорт 45 долларов»
- «Подписка Netflix 15 рублей»

Трата записывается через 30 сек. Кнопка «Отмена» отменяет запись.
