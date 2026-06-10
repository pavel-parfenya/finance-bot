import { defineComponent, ref, computed, onMounted } from "vue";
import type {
  SubscriptionInfo,
  SubscriptionPlanCard,
  SubscriptionPlanId,
} from "@finance-bot/shared";
import { fetchSubscriptionPlans } from "~/api/client";

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

function priceLabel(plan: SubscriptionPlanCard): string {
  if (plan.planId === "free" || plan.price === 0) return "Бесплатно";
  if (plan.price == null) return "—";
  const per = plan.period === "month" ? " / мес" : plan.period === "year" ? " / год" : "";
  return `${plan.price} BYN${per}`;
}

export default defineComponent({
  setup() {
    const loading = ref(true);
    const error = ref("");
    const subscription = ref<SubscriptionInfo | null>(null);
    const plans = ref<SubscriptionPlanCard[]>([]);
    // null — доступ ко всему (free-режим монетизации или конфиг Strapi недоступен)
    const availableKeys = ref<string[] | null>(null);

    const currentPlanLabel = computed(() =>
      subscription.value ? PLAN_LABEL[subscription.value.plan] : ""
    );
    const currentStatusLabel = computed(() =>
      subscription.value ? STATUS_LABEL[subscription.value.status] : ""
    );
    const expiresLabel = computed(() =>
      subscription.value ? formatDate(subscription.value.expiresAt) : null
    );

    onMounted(async () => {
      const data = await fetchSubscriptionPlans();
      if ("error" in data) {
        error.value = data.error;
      } else {
        subscription.value = data.current;
        plans.value = data.plans;
        availableKeys.value = data.currentFeatureKeys;
      }
      loading.value = false;
    });

    function isCurrent(planId: SubscriptionPlanId | null): boolean {
      return !!planId && subscription.value?.plan === planId;
    }

    /** Доступна ли фича пользователю сейчас (для пометки замком/галочкой). */
    function isAvailable(key: string): boolean {
      return availableKeys.value === null || availableKeys.value.includes(key);
    }

    return {
      loading,
      error,
      subscription,
      plans,
      currentPlanLabel,
      currentStatusLabel,
      expiresLabel,
      isCurrent,
      isAvailable,
      priceLabel,
    };
  },
});
