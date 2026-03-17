import { defineComponent, ref, watch, onMounted } from "vue";
import { getDefaultPeriodDates } from "~/utils/format";
import { fetchAnalytics } from "~/api/client";
import { useAppState } from "~/composables/useAppState";

export default defineComponent({
  setup() {
    const { refreshTrigger } = useAppState();

    const period = ref("current");
    const startDate = ref("");
    const endDate = ref("");
    const loading = ref(true);
    const error = ref<string | null>(null);
    const byCategory = ref<Array<{ category: string; amount: string }>>([]);
    const byCurrency = ref<Array<{ currency: string; amount: string }>>([]);
    const totalInDefault = ref("0");
    const defaultCurrency = ref("USD");
    const periodLabel = ref("");

    function showPeriodDates() {
      return period.value === "period";
    }

    function setDefaultPeriod() {
      const { start, end } = getDefaultPeriodDates();
      startDate.value = start;
      endDate.value = end;
    }

    async function loadAnalytics() {
      if (period.value === "period" && (!startDate.value || !endDate.value)) {
        setDefaultPeriod();
      }
      loading.value = true;
      error.value = null;
      const data = await fetchAnalytics(
        period.value,
        startDate.value || undefined,
        endDate.value || undefined
      );
      loading.value = false;
      if (data.error) {
        error.value = data.error;
        byCategory.value = [];
        byCurrency.value = [];
        return;
      }
      byCategory.value = data.byCategory ?? [];
      byCurrency.value = data.byCurrency ?? [];
      totalInDefault.value = data.totalInDefault ?? "0";
      defaultCurrency.value = data.defaultCurrency ?? "USD";
      periodLabel.value = data.periodLabel ?? "";
    }

    onMounted(() => {
      setDefaultPeriod();
      loadAnalytics();
    });

    watch([period, startDate, endDate], () => {
      if (period.value === "period" && startDate.value && endDate.value) {
        loadAnalytics();
      } else if (period.value !== "period") {
        loadAnalytics();
      }
    });

    watch(refreshTrigger, () => loadAnalytics());

    return {
      period,
      startDate,
      endDate,
      loading,
      error,
      byCategory,
      byCurrency,
      totalInDefault,
      defaultCurrency,
      periodLabel,
      showPeriodDates,
      setDefaultPeriod,
    };
  },
});
