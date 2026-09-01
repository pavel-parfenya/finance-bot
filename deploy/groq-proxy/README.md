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

## Доступ

Воркер открытый — специального секрета нет. Чтобы им воспользоваться, всё равно
нужен валидный ключ Groq (`Authorization: Bearer …`), который приходит из
приложения; чужой сожжёт свой лимит, не ваш. Если позже понадобится закрыть
доступ — можно добавить проверку заголовка в `worker.js`.

## Проверка

```bash
curl -X POST \
  -H "Authorization: Bearer $GROQ_KEY" \
  -F "model=whisper-large-v3" \
  -F "file=@sample.ogg" \
  https://groq-proxy.<subdomain>.workers.dev/openai/v1/audio/transcriptions
```
