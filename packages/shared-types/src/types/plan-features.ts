/**
 * Ключи фич, которые код умеет «гейтить» (ограничивать по тарифу).
 *
 * Источник истины для набора фич каждого плана — Strapi (коллекция `feature`,
 * связь `planFeatures` у `pricing`). Здесь перечислены лишь те ключи, на которые
 * завязана логика приложения. `Feature.key` в Strapi должен совпадать с одним из
 * этих значений, чтобы фича влияла на доступ; незнакомые ключи показываются на
 * лендинге, но ничего не ограничивают.
 */
export type FeatureKey =
  | "voice_input"
  | "advanced_analytics"
  | "forecasts"
  | "debts"
  | "collaborative"
  | "events";

/** Все распознаваемые кодом ключи фич (для валидации/итерации). */
export const RECOGNIZED_FEATURE_KEYS: readonly FeatureKey[] = [
  "voice_input",
  "advanced_analytics",
  "forecasts",
  "debts",
  "collaborative",
  "events",
] as const;

/** Является ли строка распознаваемым ключом фичи. */
export function isFeatureKey(value: string): value is FeatureKey {
  return (RECOGNIZED_FEATURE_KEYS as readonly string[]).includes(value);
}
