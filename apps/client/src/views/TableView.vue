<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import type { TransactionDto, TransactionFilters } from "@finance-bot/shared";
import TransactionCard from "@/components/TransactionCard.vue";
import FiltersPanel from "@/components/FiltersPanel.vue";
import EditModal from "@/components/EditModal.vue";
import {
  fetchTransactions,
  fetchCategories,
  fetchWorkspaceInfo,
  deleteTransaction,
} from "@/api/client";
import type { WorkspaceMember } from "@finance-bot/shared";

const PAGE_SIZE = 20;

const props = defineProps<{
  filters: TransactionFilters;
  filtersOpen: boolean;
  activeTab?: string;
  refreshTrigger?: number;
}>();

const emit = defineEmits<{
  "update:filters": [value: TransactionFilters];
  "update:filtersOpen": [value: boolean];
}>();

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

async function loadTable(filtersOverride?: TransactionFilters, reset = true) {
  const filters = filtersOverride ?? props.filters;
  if (reset) {
    loading.value = true;
    transactions.value = [];
    hasMore.value = true;
  }
  error.value = null;
  const offset = reset ? 0 : transactions.value.length;
  const data = await fetchTransactions(filters, {
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
  await loadTable(undefined, false);
}

function applyFilters(filters: TransactionFilters) {
  emit("update:filters", filters);
  emit("update:filtersOpen", false);
  loadTable(filters, true);
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
  loadTable(undefined, true);
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
    if (el && observer) {
      observer.observe(el);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  observer?.disconnect();
});

watch(
  () => props.filtersOpen,
  (open) => {
    if (open) {
      loadCategories();
      loadMembers();
    }
  }
);

watch(
  () => props.filters,
  () => loadTable(undefined, true),
  { deep: true }
);

watch(
  () => props.activeTab,
  (tab) => {
    if (tab === "table") loadMembers();
  }
);

watch(
  () => props.refreshTrigger,
  () => loadMembers()
);
</script>

<template>
  <div>
    <FiltersPanel
      v-if="props.filtersOpen"
      :model-value="props.filters"
      @update:model-value="(v) => emit('update:filters', v)"
      :categories="categories"
      :members="members"
      @apply="(filters) => applyFilters(filters)"
    />
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="transactions.length === 0" class="empty">
      Пока нет записей. Добавляйте траты в боте!
    </div>
    <div v-else class="card-list">
      <TransactionCard
        v-for="t in transactions"
        :key="t.id"
        :transaction="t"
        @edit="openEdit"
        @delete="onDelete"
      />
      <div
        v-if="hasMore && !loadingMore"
        ref="loadMoreSentinel"
        class="load-more-sentinel"
        aria-hidden="true"
      />
      <div v-if="loadingMore" class="loading-more">Загрузка...</div>
    </div>
    <EditModal
      v-if="editingTx"
      :transaction="editingTx"
      @close="closeEdit"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.loading,
.empty {
  padding: 32px 24px;
  text-align: center;
  color: var(--tg-theme-hint-color, #65676b);
  font-size: 15px;
}
.error {
  padding: 14px 16px;
  background: rgba(248, 81, 73, 0.15);
  border-radius: var(--radius);
  margin-bottom: 16px;
  color: #f85149;
  font-size: 14px;
}
.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}
.load-more-sentinel {
  height: 1px;
  width: 100%;
  visibility: hidden;
  pointer-events: none;
}
.loading-more {
  padding: 16px;
  text-align: center;
  color: var(--tg-theme-hint-color, #65676b);
  font-size: 14px;
}
</style>
