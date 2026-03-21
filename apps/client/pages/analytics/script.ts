import { defineComponent, ref, watch, onMounted } from "vue";
import type { WorkspaceMember } from "@finance-bot/shared";
import { getDefaultPeriodDates } from "~/utils/format";
import { fetchAnalytics, fetchWorkspaceInfo } from "~/api/client";
import { useAppState } from "~/composables/useAppState";

export default defineComponent({
  setup() {
    const { refreshTrigger } = useAppState();

    const period = ref("current");
    const startDate = ref("");
    const endDate = ref("");
    const userIdFilter = ref<string>("");
    const members = ref<WorkspaceMember[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const byCategory = ref<Array<{ category: string; amount: string }>>([]);
    const byCurrency = ref<Array<{ currency: string; amount: string }>>([]);
    const totalInDefault = ref("0");
    const defaultCurrency = ref("USD");
    const periodLabel = ref("");

    const showPersonFilter = () => members.value.length > 1;

    function showPeriodDates() {
      return period.value === "period";
    }

    function setDefaultPeriod() {
      const { start, end } = getDefaultPeriodDates();
      startDate.value = start;
      endDate.value = end;
    }

    async function loadMembers() {
      const data = await fetchWorkspaceInfo();
      if (!data.error) members.value = data.members ?? [];
    }

    async function loadAnalytics() {
      if (period.value === "period" && (!startDate.value || !endDate.value)) {
        setDefaultPeriod();
      }
      loading.value = true;
      error.value = null;
      const uid = userIdFilter.value ? parseInt(userIdFilter.value, 10) : undefined;
      const data = await fetchAnalytics(
        period.value,
        startDate.value || undefined,
        endDate.value || undefined,
        uid && !isNaN(uid) ? uid : undefined
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
      loadMembers();
      loadAnalytics();
    });

    watch([period, startDate, endDate, userIdFilter], () => {
      if (period.value === "period" && startDate.value && endDate.value) {
        loadAnalytics();
      } else if (period.value !== "period") {
        loadAnalytics();
      }
    });

    watch(refreshTrigger, () => {
      loadMembers();
      loadAnalytics();
    });

    return {
      period,
      startDate,
      endDate,
      userIdFilter,
      members,
      showPersonFilter,
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
