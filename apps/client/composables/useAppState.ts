import { ref, computed } from "vue";
import type { TransactionFilters } from "@finance-bot/shared";

const filtersOpen = ref(false);
const filters = ref<TransactionFilters>({});
const refreshTrigger = ref(0);

export function useAppState() {
  const activeFiltersCount = computed(() => {
    let n = 0;
    if (filters.value.period && filters.value.period !== "all") n++;
    if (filters.value.category) n++;
    if (filters.value.userId) n++;
    if (filters.value.currency) n++;
    if (filters.value.search?.trim()) n++;
    return n;
  });

  function triggerRefresh() {
    refreshTrigger.value++;
  }

  return { filtersOpen, filters, refreshTrigger, activeFiltersCount, triggerRefresh };
}
