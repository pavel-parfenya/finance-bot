/**
 * Cloudflare Worker — STT (Whisper) на Workers AI.
 *
 * Зачем: прод стоит в Беларуси, Groq (api.groq.com) блокирует запросы по гео.
 * Прокси через Cloudflare не помогает: Groq сам стоит за Cloudflare, запрос
 * идёт CF→CF и блокировка сохраняется (та же болезнь у CF AI Gateway —
 * `unsupported_country_region_territory`). Поэтому исходящий запрос убран
 * вовсе: модель выполняется прямо здесь, на Workers AI.
 *
 * Воркер прикидывается OpenAI-совместимым эндпоинтом
 * `POST /openai/v1/audio/transcriptions`: принимает тот же multipart, что шлёт
 * OpenAI SDK, и отвечает `{ "text": "…" }`. Благодаря этому приложение
 * (`WhisperSpeechRecognizer`) не меняется — достаточно env:
 *
 *   WHISPER_BASE_URL=https://stt-worker.<subdomain>.workers.dev/openai/v1
 *   WHISPER_API_KEY=<значение секрета PROXY_SECRET>
 *
 * Доступ закрыт секретом (в отличие от прежнего прокси к Groq). Раньше воркер
 * был открытым осознанно: чужак сжигал свой ключ Groq. Теперь распознавание
 * оплачивается бесплатным лимитом Workers AI нашего аккаунта, поэтому открытый
 * воркер сжигал бы наш лимит.
 */

/** Free-лимит Workers AI — 10 000 Neurons/сутки, ~46 Neurons на минуту аудио. */
const MODEL = "@cf/openai/whisper-large-v3-turbo";

/**
 * Голосовое в боте — секунды речи (ogg/opus ≈ 2 КБ/сек), так что мегабайта
 * хватает с запасом. Больше не берём: Workers AI рекомендует резать вход на
 * куски ~1 МБ, а нарезать ogg по байтам нельзя — развалится контейнер.
 */
const MAX_AUDIO_BYTES = 1024 * 1024;

const TRANSCRIPTIONS_PATH = "/audio/transcriptions";

/** Ошибки отдаём в формате OpenAI — так их разбирает и логирует OpenAI SDK. */
function errorResponse(status, message, type) {
  return Response.json({ error: { message, type } }, { status });
}

/** btoa() принимает строку, поэтому идём по буферу чанками, чтобы не переполнить стек. */
function toBase64(bytes) {
  const CHUNK = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

function isAuthorized(request, env) {
  // Fail closed: без заданного секрета воркер не работает вовсе, иначе
  // незаполненная переменная тихо превратила бы его в открытый.
  if (!env.PROXY_SECRET) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${env.PROXY_SECRET}`;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    // Путь совместим и со старым WHISPER_BASE_URL (…/openai/v1), и с голым.
    if (!pathname.endsWith(TRANSCRIPTIONS_PATH)) {
      return errorResponse(404, `Неизвестный путь: ${pathname}`, "invalid_request_error");
    }
    if (request.method !== "POST") {
      return errorResponse(405, "Ожидается POST.", "invalid_request_error");
    }
    if (!isAuthorized(request, env)) {
      return errorResponse(401, "Неверный ключ.", "invalid_request_error");
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return errorResponse(400, "Ожидается multipart/form-data.", "invalid_request_error");
    }

    const file = form.get("file");
    if (!file || typeof file === "string") {
      return errorResponse(400, "Не передан файл в поле file.", "invalid_request_error");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length === 0) {
      return errorResponse(400, "Пустой аудиофайл.", "invalid_request_error");
    }
    if (bytes.length > MAX_AUDIO_BYTES) {
      return errorResponse(
        413,
        `Аудио больше ${MAX_AUDIO_BYTES} байт — слишком длинное сообщение.`,
        "invalid_request_error"
      );
    }

    // Поле model из запроса игнорируем: модель здесь задаётся воркером, а SDK
    // всё равно шлёт groq'овое имя (whisper-large-v3).
    const inputs = { audio: toBase64(bytes) };
    const language = form.get("language") ?? env.WHISPER_LANGUAGE;
    if (typeof language === "string" && language) inputs.language = language;
    const prompt = form.get("prompt");
    if (typeof prompt === "string" && prompt) inputs.initial_prompt = prompt;

    let result;
    try {
      result = await env.AI.run(MODEL, inputs);
    } catch (error) {
      console.error("Workers AI не смог распознать аудио:", error);
      return errorResponse(502, "Ошибка распознавания.", "api_error");
    }

    return Response.json({ text: result?.text ?? "" });
  },
};
