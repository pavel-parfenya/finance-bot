import { defineComponent, ref, computed, onMounted } from "vue";
import type {
  SubscriptionInfo,
  SubscriptionPlanCard,
  SubscriptionPlanId,
  PlanFeatureItem,
} from "@finance-bot/shared";
import { fetchSubscriptionPlans, fetchCheckoutLink } from "~/api/client";

/** Открыть внешнюю ссылку из Telegram Mini App (или обычным переходом — для дев-режима). */
function openExternal(url: string): void {
  const tg = (
    window as unknown as { Telegram?: { WebApp?: { openLink?: (u: string) => void } } }
  ).Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank");
  }
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

    /** Получить ссылку и открыть страницу подписки на сайте во внешнем браузере. */
    async function changePlan(): Promise<void> {
      if (checkoutLoading.value) return;
      checkoutLoading.value = true;
      checkoutError.value = "";
      const res = await fetchCheckoutLink();
      checkoutLoading.value = false;
      if ("error" in res) {
        checkoutError.value = res.error;
        return;
      }
      openExternal(res.url);
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
