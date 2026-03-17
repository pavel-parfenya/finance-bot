import { defineComponent, ref, watch, onMounted, onUnmounted } from "vue";
import type { TransactionDto, TransactionFilters } from "@finance-bot/shared";
import type { WorkspaceMember } from "@finance-bot/shared";
import {
  fetchTransactions,
  fetchCategories,
  fetchWorkspaceInfo,
  deleteTransaction,
} from "~/api/client";
import { useAppState } from "~/composables/useAppState";

const PAGE_SIZE = 20;

export default defineComponent({
  setup() {
    const { filters, filtersOpen, refreshTrigger } = useAppState();

    const transactions = ref<TransactionDto[]>([]);
    const loading = ref(true);
    const loadingMore = ref(false);
    const hasMore = ref(true);
    const error = ref<string | null>(null);
    const categories = ref<string[]>([]);
    const members = ref<WorkspaceMember[]>([]);
    const editingTx = ref<TransactionDto | null>(null);
    const loadMoreSentinel = ref<HTMLElement | null>(null);

    async function loadMembers() {
      const data = await fetchWorkspaceInfo();
      if (!data.error) members.value = data.members ?? [];
    }

    async function loadCategories() {
      const data = await fetchCategories();
      if (!data.error && data.categories) categories.value = data.categories;
    }

    async function loadTable(reset = true) {
      if (reset) {
        loading.value = true;
        transactions.value = [];
        hasMore.value = true;
      }
      error.value = null;
      const offset = reset ? 0 : transactions.value.length;
      const data = await fetchTransactions(filters.value, {
        limit: PAGE_SIZE,
        offset,
      });
      loading.value = false;
      loadingMore.value = false;
      if ("error" in data && data.error) {
        error.value = data.error;
        if (reset) transactions.value = [];
        return;
      }
      const resp = data as { transactions: TransactionDto[]; hasMore: boolean };
      if (reset) {
        transactions.value = resp.transactions ?? [];
      } else {
        transactions.value = [...transactions.value, ...(resp.transactions ?? [])];
      }
      hasMore.value = resp.hasMore ?? false;
    }

    async function loadMore() {
      if (loadingMore.value || !hasMore.value || loading.value) return;
      loadingMore.value = true;
      await loadTable(false);
    }

    function applyFilters(f: TransactionFilters) {
      filters.value = f;
      filtersOpen.value = false;
      loadTable(true);
    }

    function openEdit(tx: TransactionDto) {
      editingTx.value = tx;
    }

    function closeEdit() {
      editingTx.value = null;
    }

    async function onSaved(updated: TransactionDto) {
      const idx = transactions.value.findIndex((t) => t.id === updated.id);
      if (idx >= 0) transactions.value[idx] = updated;
      closeEdit();
    }

    async function onDelete(tx: TransactionDto) {
      if (!confirm("Удалить эту запись?")) return;
      const data = await deleteTransaction(tx.id);
      if (data.error) {
        alert(data.error);
        return;
      }
      transactions.value = transactions.value.filter((t) => t.id !== tx.id);
    }

    let observer: IntersectionObserver | null = null;

    onMounted(() => {
      loadTable(true);
      loadMembers();
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (
            entry?.isIntersecting &&
            hasMore.value &&
            !loading.value &&
            !loadingMore.value
          ) {
            loadMore();
          }
        },
        { rootMargin: "100px", threshold: 0 }
      );
    });

    watch(
      loadMoreSentinel,
      (el) => {
        if (el && observer) observer.observe(el);
      },
      { immediate: true }
    );

    onUnmounted(() => {
      observer?.disconnect();
    });

    watch(filtersOpen, (open) => {
      if (open) {
        loadCategories();
        loadMembers();
      }
    });

    watch(refreshTrigger, () => loadMembers());

    return {
      filters,
      filtersOpen,
      transactions,
      loading,
      loadingMore,
      hasMore,
      error,
      categories,
      members,
      editingTx,
      loadMoreSentinel,
      applyFilters,
      openEdit,
      closeEdit,
      onSaved,
      onDelete,
    };
  },
});
