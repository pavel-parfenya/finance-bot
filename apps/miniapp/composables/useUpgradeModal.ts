import { ref } from "vue";

/**
 * Маркер серверной ошибки фич-гейтинга. Все сообщения вида
 * «… доступен на платном тарифе. Оформите подписку в разделе «Подписка».»
 * содержат эту фразу — по ней отличаем гейт тарифа от прочих ошибок API.
 */
const UPGRADE_MARKER = "Оформите подписку";

// Синглтон-состояние модалки апгрейда: открыта одна на всё приложение
// (смонтирована в layout `default`), наполняется из любого места через composable.
const open = ref(false);
const message = ref("");

export function isUpgradeError(error: string | null | undefined): boolean {
  return typeof error === "string" && error.includes(UPGRADE_MARKER);
}

export function useUpgradeModal() {
  function openUpgrade(rawMessage: string): void {
    // Отрезаем хвост «Оформите подписку в разделе «Подписка».» — теперь за это
    // отвечает кнопка «Сменить план», в тексте он лишний.
    message.value = rawMessage.replace(/\s*Оформите подписку.*$/u, "").trim();
    open.value = true;
  }

  function close(): void {
    open.value = false;
  }

  /**
   * Показать ошибку API: гейт тарифа — модалкой апгрейда, всё остальное — alert.
   */
  function notifyApiError(error: string): void {
    if (isUpgradeError(error)) {
      openUpgrade(error);
    } else {
      alert(error);
    }
  }

  return { open, message, openUpgrade, close, notifyApiError, isUpgradeError };
}
