import { ref } from "vue";
import { fetchSubscriptionPlans } from "~/api/client";

/**
 * Синглтон-осведомлённость клиента о фичах текущего тарифа (для проактивных
 * «замков» в UI). Источник — `GET /api/subscription/plans` → `currentFeatureKeys`.
 *
 * `featureKeys === null` означает «доступ ко всему» (монетизация в free-режиме или
 * конфиг Strapi недоступен) — в этом случае НИЧЕГО не блокируем. Пока данные не
 * загружены, `hasFeature` тоже возвращает `true`, чтобы замки не «мигали» до ответа.
 */
const featureKeys = ref<string[] | null>(null);
const loaded = ref(false);
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  const data = await fetchSubscriptionPlans();
  if (!("error" in data)) {
    featureKeys.value = data.currentFeatureKeys;
  }
  loaded.value = true;
}

export function useFeatures() {
  /** Грузит фичи один раз на приложение (повторные вызовы переиспользуют результат). */
  function ensureLoaded(): Promise<void> {
    if (loaded.value) return Promise.resolve();
    if (!inflight) {
      inflight = refresh().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }

  /** Есть ли доступ к фиче. До загрузки и при `null` — не блокируем (true). */
  function hasFeature(key: string): boolean {
    if (featureKeys.value === null) return true;
    return featureKeys.value.includes(key);
  }

  return { featureKeys, loaded, ensureLoaded, refresh, hasFeature };
}
