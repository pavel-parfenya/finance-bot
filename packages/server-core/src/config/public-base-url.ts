/** Чистая логика базового URL Mini App / API (без чтения process.env на этапе импорта). */
export function resolvePublicBaseUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>
): string {
  const explicit = env["PUBLIC_BASE_URL"]?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const render = env["RENDER_EXTERNAL_URL"]?.trim();
  if (render) return render.replace(/\/$/, "");
  return "";
}

/** Перекрывает `PUBLIC_BASE_URL` в `into` значением из распарсенного корневого `.env`. */
export function mergeRootDotenvPublicBaseUrl(
  parsed: Record<string, string>,
  into: NodeJS.ProcessEnv
): void {
  if (Object.prototype.hasOwnProperty.call(parsed, "PUBLIC_BASE_URL")) {
    const v = parsed["PUBLIC_BASE_URL"];
    if (v !== undefined) into["PUBLIC_BASE_URL"] = v;
  }
}
