import { defineComponent, ref, computed, onMounted } from "vue";
import type {
  SubscriptionInfo,
  SubscriptionPlanCard,
  SubscriptionPlanId,
  PlanFeatureItem,
} from "@finance-bot/shared";
import { fetchSubscriptionPlans, fetchCheckoutLink } from "~/api/client";

/**
 * Открыть страницу подписки внутри Telegram, а не в отдельном браузере.
 *
 * `Telegram.WebApp.openLink` открывает ссылку во внешнем/встроенном браузере
 * поверх Mini App (Safari View Controller на iOS, Custom Tab на Android) — это и
 * есть «отдельное приложение браузера». Чтобы остаться внутри Telegram, переводим
 * текущую WebView на адрес `/subscribe` (Mini App сам уже является WebView
 * Telegram, так что навигация не выходит за его пределы).
 */
function openSubscribePage(url: string): void {
  window.location.assign(url);
}

const PLAN_LABEL: Record<SubscriptionPlanId, string> = {
  free: "Free",
  pro_month: "Pro (месяц)",
  pro_year: "Pro (год)",
};

const STATUS_LABEL: Record<SubscriptionInfo["status"], string> = {
  active: "Активна",
  canceled: "Отменена",
  expired: "Истекла",
  past_due: "Просрочена",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default defineComponent({
  setup() {
    const loading = ref(true);
    const error = ref("");
    const subscription = ref<SubscriptionInfo | null>(null);
    const plans = ref<SubscriptionPlanCard[]>([]);
    const checkoutLoading = ref(false);
    const checkoutError = ref("");

    const currentPlanLabel = computed(() =>
      subscription.value ? PLAN_LABEL[subscription.value.plan] : ""
    );
    const currentStatusLabel = computed(() =>
      subscription.value ? STATUS_LABEL[subscription.value.status] : ""
    );
    const expiresLabel = computed(() =>
      subscription.value ? formatDate(subscription.value.expiresAt) : null
    );

    /** Фичи, входящие в текущий тариф пользователя (из карточки этого тарифа). */
    const currentFeatures = computed<PlanFeatureItem[]>(() => {
      const planId = subscription.value?.plan;
      if (!planId) return [];
      return plans.value.find((p) => p.planId === planId)?.features ?? [];
    });

    onMounted(async () => {
      const data = await fetchSubscriptionPlans();
      if ("error" in data) {
        error.value = data.error;
      } else {
        subscription.value = data.current;
        plans.value = data.plans;
      }
      loading.value = false;
    });

    /** Получить ссылку и открыть страницу подписки внутри Telegram (в текущей WebView). */
    async function changePlan(): Promise<void> {
      if (checkoutLoading.value) return;
      checkoutLoading.value = true;
      checkoutError.value = "";
      const res = await fetchCheckoutLink();
      if ("error" in res) {
        checkoutLoading.value = false;
        checkoutError.value = res.error;
        return;
      }
      // checkoutLoading не сбрасываем: WebView уходит на страницу подписки.
      openSubscribePage(res.url);
    }

    return {
      loading,
      error,
      subscription,
      currentPlanLabel,
      currentStatusLabel,
      expiresLabel,
      currentFeatures,
      checkoutLoading,
      checkoutError,
      changePlan,
    };
  },
});
