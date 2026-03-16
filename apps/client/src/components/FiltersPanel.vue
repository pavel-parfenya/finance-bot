<script setup lang="ts">
import { ref, watch } from "vue";
import type { TransactionFilters } from "@finance-bot/shared";
import { CURRENCIES, getDefaultPeriodDates } from "@/utils/format";

const props = defineProps<{
  modelValue: TransactionFilters;
  categories: string[];
  members: Array<{ userId: number; username: string | null }>;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TransactionFilters];
  apply: [value: TransactionFilters];
}>();

const local = ref<TransactionFilters>({ ...props.modelValue });
watch(
  () => props.modelValue,
  (v) => {
    local.value = { ...v };
  },
  { deep: true }
);

function normalizeFilters(v: TransactionFilters): TransactionFilters {
  const out = { ...v };
  if (out.userId === "" || out.userId === undefined) out.userId = undefined;
  else out.userId = Number(out.userId);
  return out;
}

function reset() {
  local.value = {
    period: "all",
    startDate: undefined,
    endDate: undefined,
    category: undefined,
    currency: undefined,
    userId: undefined,
    search: undefined,
  };
  const v = normalizeFilters(local.value);
  emit("update:modelValue", v);
  emit("apply", v);
}

function apply() {
  const v = normalizeFilters({ ...local.value });
  emit("update:modelValue", v);
  emit("apply", v);
}

const showPeriodDates = () => local.value.period === "period";

function setDefaultPeriod() {
  const { start, end } = getDefaultPeriodDates();
  local.value = { ...local.value, startDate: start, endDate: end };
}
</script>

<template>
  <div class="filters-panel" role="region" aria-label="Фильтры">
    <div class="filter-group">
      <label class="filter-label">Период</label>
      <select
        v-model="local.period"
        class="filter-select"
        @change="showPeriodDates() && setDefaultPeriod()"
      >
        <option value="all">Все время</option>
        <option value="current">Текущий месяц</option>
        <option value="prev">Предыдущий месяц</option>
        <option value="period">Период</option>
      </select>
      <div v-show="showPeriodDates()" class="period-dates">
        <input v-model="local.startDate" type="date" placeholder="Начало" />
        <input v-model="local.endDate" type="date" placeholder="Конец" />
      </div>
    </div>
    <div class="filter-group">
      <label class="filter-label">Категория</label>
      <select v-model="local.category" class="filter-select">
        <option value="">Все</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label class="filter-label">Кто добавил</label>
      <select v-model="local.userId" class="filter-select">
        <option value="">Все</option>
        <option v-for="m in members" :key="m.userId" :value="m.userId">
          {{ m.username ? `@${m.username}` : `Участник #${m.userId}` }}
        </option>
      </select>
    </div>
    <div class="filter-group">
      <label class="filter-label">Валюта</label>
      <select v-model="local.currency" class="filter-select">
        <option value="">Все</option>
        <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label class="filter-label">Поиск</label>
      <input
        v-model="local.search"
        type="text"
        class="filter-input"
        placeholder="По описанию..."
        autocomplete="off"
      />
    </div>
    <div class="filters-actions">
      <button type="button" class="btn-filter-reset" @click="reset">Сбросить</button>
      <button type="button" class="btn-filter-apply" @click="apply">Применить</button>
    </div>
  </div>
</template>

<style scoped>
.filters-panel {
  margin-bottom: 12px;
  padding: 14px;
  background: var(--tg-theme-secondary-bg-color, #f0f2f5);
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.filter-group {
  margin-bottom: 12px;
}
.filter-group:last-of-type {
  margin-bottom: 0;
}
.filter-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--tg-theme-hint-color);
  margin-bottom: 6px;
}
.filter-select,
.filter-input {
  width: 100%;
  padding: 10px 14px;
  min-height: 44px;
  font-size: 15px;
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238b949e' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}
.filter-input {
  background-image: none;
  padding-right: 14px;
}
.filters-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.btn-filter-reset,
.btn-filter-apply {
  flex: 1;
  min-height: 44px;
  padding: 10px 16px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.btn-filter-reset {
  background: rgba(255, 255, 255, 0.1);
  color: var(--tg-theme-text-color);
}
.btn-filter-apply {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
}
.period-dates {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.period-dates input {
  flex: 1;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 15px;
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
}
</style>
