import OpenAI from "openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

/**
 * Единая фабрика клиента DeepSeek с устойчивыми настройками сети.
 * `maxRetries` покрывает ретраи самого SDK (до чтения тела ответа),
 * `timeout` ограничивает «висящие» соединения.
 */
export function createDeepSeekClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_BASE_URL,
    timeout: 60_000,
    maxRetries: 3,
  });
}

/**
 * Транзиентные сетевые ошибки, на которых имеет смысл повторить запрос.
 * Главный кейс — ERR_STREAM_PREMATURE_CLOSE: соединение оборвалось при
 * распаковке тела ответа, т.е. уже после точки ретрая внутри SDK,
 * поэтому SDK такую ошибку наружу не ретраит.
 */
function isTransientError(err: unknown): boolean {
  const e = err as { code?: string; name?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "ERR_STREAM_PREMATURE_CLOSE") return true;
  if (e.name === "APIConnectionError" || e.name === "APIConnectionTimeoutError") {
    return true;
  }
  return /premature close|econnreset|socket hang up|terminated|fetch failed|network/i.test(
    e.message ?? ""
  );
}

/**
 * Оборачивает вызов к DeepSeek повторами на транзиентных сетевых сбоях
 * с небольшой нарастающей задержкой. Не-транзиентные ошибки пробрасываются сразу.
 */
export async function withDeepSeekRetry<T>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err) || i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
    }
  }
  throw lastError;
}
