import { defineComponent, ref, computed, onMounted } from "vue";
import type {
  AdminBepaidSubscription,
  AdminBepaidSubscriptionsResponse,
} from "@finance-bot/shared";
import { fetchAdminBepaidSubscriptions } from "~/api/client";

/** Человекочитаемая подпись состояния подписки bePaid. */
const STATE_LABEL: Record<string, string> = {
  active: "Активна",
  trial: "Пробный период",
  pending: "Ожидает оплаты",
  processing: "Обработка",
  failed_attempt: "Ошибка списания",
  failed: "Провалена",
  canceled: "Отменена",
};

function stateLabel(state: string): string {
  return STATE_LABEL[state] ?? state;
}

/** CSS-модификатор для цветовой метки состояния. */
function stateVariant(state: string): string {
  if (state === "active" || state === "trial") return "active";
  if (state === "canceled" || state === "failed") return "canceled";
  if (state === "failed_attempt") return "warn";
  return "neutral";
}

/** ISO → dd.mm.yyyy hh:mm (локальное время). */
function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatAmount(sub: AdminBepaidSubscription): string {
  if (sub.amount == null) return "—";
  const amount = Number.isInteger(sub.amount)
    ? String(sub.amount)
    : sub.amount.toFixed(2);
  return sub.currency ? `${amount} ${sub.currency}` : amount;
}

export default defineComponent({
  setup() {
    const loading = ref(true);
    const error = ref<string | null>(null);
    const subscriptions = ref<AdminBepaidSubscription[]>([]);
    const gateway = ref<"bepaid" | "test">("test");
    const testMode = ref(false);

    const isTestGateway = computed(() => gateway.value !== "bepaid");

    async function load() {
      loading.value = true;
      error.value = null;
      const data = await fetchAdminBepaidSubscriptions();
      if ("error" in data && data.error) {
        error.value =
          typeof data.error === "string" ? data.error : "Не удалось загрузить";
        loading.value = false;
        return;
      }
      const d = data as AdminBepaidSubscriptionsResponse;
      gateway.value = d.gateway;
      testMode.value = d.testMode;
      subscriptions.value = d.subscriptions ?? [];
      loading.value = false;
    }

    onMounted(load);

    return {
      loading,
      error,
      subscriptions,
      gateway,
      testMode,
      isTestGateway,
      stateLabel,
      stateVariant,
      formatDateTime,
      formatAmount,
      reload: load,
    };
  },
});
