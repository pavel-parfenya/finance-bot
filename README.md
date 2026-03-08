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
3. Enable the **Google Sheets API**
4. Create a **Service Account** and download the JSON key
5. Copy the `client_email` and `private_key` from the JSON key
6. Create a Google Sheet and share it with the service account email (Editor role)
7. Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

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

## Usage

Send the bot a text or voice message like:

- "I bought 3 packs of eggs for $3 at the Market"
- "Paid $45 for a taxi to the airport"
- "Netflix subscription $15"

The bot will parse the message, categorize it, and add a row to your Google Sheet with columns:

| Date | Description | Category | Amount | Currency | Store |
|---|---|---|---|---|---|
| 2026-03-08 | 3 packs of eggs | Groceries | 3 | USD | Market |

### Categories

Groceries, Transport, Entertainment, Healthcare, Utilities, Dining, Shopping, Education, Housing, Personal Care, Other
