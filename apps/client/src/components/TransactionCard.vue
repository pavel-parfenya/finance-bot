<script setup lang="ts">
import type { TransactionDto } from "@finance-bot/shared";
import { formatDate } from "@/utils/format";

defineProps<{
  transaction: TransactionDto;
}>();

const emit = defineEmits<{
  edit: [tx: TransactionDto];
  delete: [tx: TransactionDto];
}>();

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
</script>

<template>
  <div class="card" :data-id="transaction.id">
    <div class="card-main">
      <div class="card-desc">{{ transaction.description || "" }}</div>
      <div class="card-meta">
        {{ formatDate(transaction.date) }}
        <template v-if="transaction.category"> · {{ transaction.category }}</template>
      </div>
    </div>
    <div class="card-actions">
      <span class="card-amount">
        {{ transaction.amount }}
        <span v-if="transaction.currency" class="currency">{{
          transaction.currency
        }}</span>
      </span>
      <button
        type="button"
        class="btn-edit"
        title="Изменить"
        @click="emit('edit', transaction)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        class="btn-del"
        title="Удалить"
        @click="emit('delete', transaction)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--tg-theme-secondary-bg-color, #fff);
  border-radius: var(--radius);
  padding: 12px 16px;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.card-main {
  flex: 1;
  min-width: 0;
}
.card-desc {
  font-weight: 500;
  margin-bottom: 4px;
  word-break: break-word;
}
.card-meta {
  font-size: 13px;
  color: var(--tg-theme-hint-color, #65676b);
}
.card-amount {
  font-weight: 700;
  font-size: 17px;
  white-space: nowrap;
  color: var(--tg-theme-button-color, #1877f2);
}
.card-amount .currency {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.85;
  margin-left: 2px;
}
.card-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}
.btn-del,
.btn-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  line-height: 1;
}
.btn-del svg,
.btn-edit svg {
  width: 14px;
  height: 14px;
}
.btn-del {
  background: rgba(248, 81, 73, 0.12);
  color: #f85149;
}
.btn-del:active {
  opacity: 0.8;
}
.btn-edit {
  background: rgba(88, 166, 255, 0.12);
  color: #58a6ff;
}
.btn-edit:active {
  opacity: 0.8;
}
</style>
