# Groq proxy (Cloudflare Worker)

Прокси к Groq (Whisper STT) для обхода геоблокировки белорусского IP прода.
Groq остаётся бесплатным — воркер лишь перенаправляет запрос через edge Cloudflare.

## Как это встроено в приложение

STT-код (`WhisperSpeechRecognizer`) уже провайдер-независимый: base URL берётся
из `WHISPER_BASE_URL`. Поэтому подключение прокси — это **только смена env**, без
правок кода:

```
WHISPER_BASE_URL=https://groq-proxy.<subdomain>.workers.dev/openai/v1
WHISPER_API_KEY=<обычный ключ Groq>   # не меняется
```

## Деплой

Нужен бесплатный аккаунт Cloudflare. Локально:

```bash
npm install -g wrangler
cd deploy/groq-proxy
wrangler login
wrangler deploy
```

После деплоя wrangler покажет URL воркера, например
`https://groq-proxy.<subdomain>.workers.dev`. В `WHISPER_BASE_URL` на проде
допишите путь `/openai/v1` и перекатите сервис.

## Защита от чужого использования

Открытый прокси может дёргать кто угодно. Чтобы принимать запросы только от
своего приложения, задайте одинаковый секрет с двух сторон:

```bash
# на воркере
wrangler secret put PROXY_SECRET
```

```bash
# в .env приложения — то же значение
WHISPER_PROXY_SECRET=<тот же секрет>
```

Приложение уже умеет слать этот заголовок: `WhisperSpeechRecognizer` при заданном
`WHISPER_PROXY_SECRET` добавляет `X-Proxy-Secret` в каждый STT-запрос (через
`defaultHeaders` OpenAI SDK). Если секрет расходится или у воркера `PROXY_SECRET`
задан, а у приложения нет — воркер вернёт `403`. Оба пустые — проверка отключена.

## Проверка

```bash
curl -X POST \
  -H "Authorization: Bearer $GROQ_KEY" \
  -F "model=whisper-large-v3" \
  -F "file=@sample.ogg" \
  https://groq-proxy.<subdomain>.workers.dev/openai/v1/audio/transcriptions
```
