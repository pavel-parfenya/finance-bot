# Деплой на Render — Mini App

## 1. База данных

Создай PostgreSQL на Render (или используй Neon, Supabase и т.п.). Скопируй `DATABASE_URL`.

## 2. Переменные окружения в Render

В Dashboard → Environment добавь:

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` |
| `TELEGRAM_BOT_TOKEN` | Токен бота из @BotFather |
| `DEEPSEEK_API_KEY` | Ключ DeepSeek |
| `WHISPER_API_KEY` | Ключ Whisper (Groq и т.п.) |

Остальные (`WEBHOOK_SECRET`, `RENDER_EXTERNAL_URL`) Render задаёт сам.

## 3. Настройка Mini App в Telegram

После деплоя у сервиса будет URL вида `https://finance-bot-xxxx.onrender.com`.

1. Открой @BotFather → `/mybots` → твой бот → **Bot Settings** → **Menu Button**
2. Выбери **Configure menu button**
3. Укажи URL: `https://ТВОЙ-APP.onrender.com/app`

Либо через команду:
```
/setmenubutton
```
→ Web App → URL: `https://ТВОЙ-APP.onrender.com/app`

## 4. Домен для Web App

Telegram требует HTTPS. Render даёт его по умолчанию.

Домен должен совпадать с тем, что указан в Menu Button. Render автоматически подставляет `RENDER_EXTERNAL_URL`, из него берётся `publicBaseUrl` и URL Mini App (`/app`).

## 5. Деплой

```bash
git push
```

При использовании `render.yaml` сервис создастся/обновится автоматически.

---

**Важно:** На бесплатном плане Render «засыпает» после ~15 минут без запросов. Первый запрос после этого может занимать 30–60 секунд.
