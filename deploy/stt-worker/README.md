# STT worker (Cloudflare Workers AI)

Распознавание голосовых сообщений на `@cf/openai/whisper-large-v3-turbo`.
Воркер прикидывается OpenAI-совместимым `/audio/transcriptions`, поэтому код
приложения (`WhisperSpeechRecognizer`) не меняется — только env.

## Почему не Groq

Прод стоит в Беларуси, Groq блокирует запросы по гео. Прежний вариант — прокси
через этот же воркер на `api.groq.com` — не сработал: Groq сам стоит за
Cloudflare, запрос идёт CF→CF и блокировка сохраняется (та же проблема у CF AI
Gateway — `unsupported_country_region_territory`). Workers AI убирает исходящий
запрос вовсе: модель выполняется на edge Cloudflare.

## Лимиты

| | |
|---|---|
| Free-лимит Workers AI | 10 000 Neurons/сутки (сброс в 00:00 UTC) |
| Цена whisper-large-v3-turbo | $0.00051 за минуту аудио ≈ 46 Neurons/мин |
| Бесплатно выходит | ~215 минут аудио в сутки ≈ ~1600 голосовых по 8 сек |

Максимальный размер аудио — 1 МБ (≈ 8 минут ogg/opus); больше воркер отклоняет
с 413, бот покажет обычную ошибку распознавания.

## Деплой

Нужен бесплатный аккаунт Cloudflare.

```bash
npm install -g wrangler
cd deploy/stt-worker
wrangler login
wrangler secret put PROXY_SECRET   # придумайте длинную случайную строку
wrangler deploy
```

Wrangler покажет URL, например `https://stt-worker.<subdomain>.workers.dev`.

Старый воркер стоит убрать, чтобы не висел: `wrangler delete --name groq-proxy`.

## Env на проде

```
WHISPER_BASE_URL=https://stt-worker.<subdomain>.workers.dev/openai/v1
WHISPER_API_KEY=<то же значение, что в PROXY_SECRET>
```

`WHISPER_API_KEY` теперь не ключ Groq, а секрет воркера: OpenAI SDK шлёт его в
`Authorization: Bearer …`, воркер сверяет и только тогда пускает. Ключ Groq
больше не нужен нигде.

## Доступ

Воркер закрыт секретом — в отличие от прежнего прокси, который был открытым
осознанно (чужак сжигал свой ключ Groq). Здесь распознавание оплачивается
бесплатным лимитом нашего аккаунта, поэтому открытый воркер сжигал бы наш лимит.
Без заданного `PROXY_SECRET` воркер отвечает 401 на всё — чтобы незаполненная
переменная не превратила его в открытый.

## Проверка

```bash
curl -X POST \
  -H "Authorization: Bearer $PROXY_SECRET" \
  -F "model=whisper-large-v3" \
  -F "file=@sample.ogg" \
  https://stt-worker.<subdomain>.workers.dev/openai/v1/audio/transcriptions
```

Ожидаемый ответ — `{"text":"…"}`. Проверять лучше сразу на настоящей голосовухе
из Telegram (ogg/opus), а не на wav: этот формат — основной рабочий вход, и
именно на нём стоит убедиться, что Workers AI принимает opus без перекодировки.
