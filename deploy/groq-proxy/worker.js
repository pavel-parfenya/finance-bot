/**
 * Cloudflare Worker — прокси к Groq (Whisper STT).
 *
 * Зачем: прод стоит в Беларуси, Groq (api.groq.com) блокирует запросы по
 * геолокации IP. Воркер выполняется на edge Cloudflare, исходящий IP — не
 * белорусский, поэтому Groq отвечает. Приложение не меняется: достаточно
 * указать WHISPER_BASE_URL на этот воркер.
 *
 * Пример: WHISPER_BASE_URL=https://groq-proxy.<subdomain>.workers.dev/openai/v1
 * Тогда OpenAI SDK бьёт в .../openai/v1/audio/transcriptions, а воркер шлёт
 * тот же путь на https://api.groq.com/openai/v1/audio/transcriptions.
 *
 * Авторизация Groq (Bearer <GROQ_KEY>) приходит из приложения в заголовке
 * Authorization и просто пробрасывается дальше — ключ в воркере не хранится.
 * Воркер открытый: чтобы им воспользоваться, всё равно нужен валидный ключ Groq
 * (чужой сожжёт свой лимит, не ваш).
 */
const GROQ_ORIGIN = "https://api.groq.com";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(GROQ_ORIGIN);
    target.pathname = incoming.pathname;
    target.search = incoming.search;

    // Копируем заголовки, кроме hop-by-hop.
    const headers = new Headers(request.headers);
    headers.delete("host");

    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  },
};
