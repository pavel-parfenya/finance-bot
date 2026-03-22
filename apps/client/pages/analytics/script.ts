import { defineComponent, ref, computed, watch, onMounted } from "vue";
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
    const totalInDefault = ref("0");
    const totalIncomeInDefault = ref("0");
    const totalExpenseInDefault = ref("0");
    const hasIncome = ref(false);
    const defaultCurrency = ref("USD");

    const showPersonFilter = () => members.value.length > 1;

    const chartItems = computed(() => {
      const categories = byCategory.value;
      const totalInc = parseFloat(totalIncomeInDefault.value) || 0;
      const totalExp = parseFloat(totalExpenseInDefault.value) || 0;

      if (!hasIncome.value) {
        return getExpenseCategoriesForChart(categories).map((x) => ({
          category: x.category,
          value: x.amount,
        }));
      }

      if (totalInc <= 0) return [];
      const expenseOnly = categories.filter((x) => parseFloat(x.amount) < 0);
      const items = expenseOnly.map((x) => ({
        category: x.category,
        value: Math.round((Math.abs(parseFloat(x.amount)) / totalInc) * 1000) / 10,
      }));

      const remainder =
        Math.round(Math.max(0, (totalInc - totalExp) / totalInc) * 1000) / 10;
      if (remainder > 0) {
        items.push({ category: "Остаток", value: remainder });
      }
      return items;
    });

    const chartFormatAsPercent = computed(() => hasIncome.value);

    const expensesPercent = computed(() => {
      const inc = parseFloat(totalIncomeInDefault.value) || 0;
      const exp = parseFloat(totalExpenseInDefault.value) || 0;
      if (inc <= 0) return 0;
      return Math.min(100, Math.round((exp / inc) * 1000) / 10);
    });

    const balancePercent = computed(() => {
      const inc = parseFloat(totalIncomeInDefault.value) || 0;
      const exp = parseFloat(totalExpenseInDefault.value) || 0;
      if (inc <= 0) return 0;
      return Math.round(Math.max(0, (inc - exp) / inc) * 1000) / 10;
    });

    const chartCategoryList = computed(() => {
      const categories = byCategory.value;
      const totalInc = parseFloat(totalIncomeInDefault.value) || 0;

      if (!hasIncome.value) {
        return getExpenseCategoriesForChart(categories).map((x) => ({
          category: x.category,
          amount: String(x.amount.toFixed(2)),
          percent: null as string | null,
        }));
      }
      if (totalInc <= 0) return [];
      const expenseOnly = categories.filter((x) => parseFloat(x.amount) < 0);
      const totalExp = parseFloat(totalExpenseInDefault.value) || 0;
      const list = expenseOnly.map((x) => {
        const amt = Math.abs(parseFloat(x.amount));
        const pct = Math.round((amt / totalInc) * 1000) / 10;
        return {
          category: x.category,
          amount: String(amt.toFixed(2)),
          percent: pct.toFixed(1) + "%",
        };
      });
      const remainder = Math.max(0, totalInc - totalExp);
      const remainderPct = Math.round((remainder / totalInc) * 1000) / 10;
      list.push({
        category: "Остаток",
        amount: remainder.toFixed(2),
        percent: remainderPct.toFixed(1) + "%",
      });
      return list;
    });

    function getExpenseCategoriesForChart(
      cats: Array<{ category: string; amount: string }>
    ): Array<{ category: string; amount: number }> {
      return cats
        .filter((x) => {
          const n = parseFloat(x.amount);
          return hasIncome.value ? n < 0 : n > 0;
        })
        .map((x) => ({
          category: x.category,
          amount: Math.abs(parseFloat(x.amount)),
        }))
        .filter((x) => x.amount > 0);
    }

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
        return;
      }
      byCategory.value = data.byCategory ?? [];
      totalInDefault.value = data.totalInDefault ?? "0";
      totalIncomeInDefault.value = data.totalIncomeInDefault ?? "0";
      totalExpenseInDefault.value = data.totalExpenseInDefault ?? "0";
      hasIncome.value = data.hasIncome ?? false;
      defaultCurrency.value = data.defaultCurrency ?? "USD";
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
      totalInDefault,
      totalIncomeInDefault,
      totalExpenseInDefault,
      hasIncome,
      chartItems,
      chartFormatAsPercent,
      chartCategoryList,
      expensesPercent,
      balancePercent,
      defaultCurrency,
      showPeriodDates,
      setDefaultPeriod,
    };
  },
});
