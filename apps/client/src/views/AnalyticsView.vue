<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { getDefaultPeriodDates } from "@/utils/format";
import AnalyticsChart from "@/components/AnalyticsChart.vue";
import { fetchAnalytics } from "@/api/client";

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

const showPeriodDates = () => period.value === "period";

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
</script>

<template>
  <div>
    <div class="analytics-controls">
      <select v-model="period" @change="period === 'period' && setDefaultPeriod()">
        <option value="current">Текущий месяц</option>
        <option value="prev">Предыдущий месяц</option>
        <option value="period">Период</option>
      </select>
      <div v-show="showPeriodDates()" class="period-dates">
        <input v-model="startDate" type="date" placeholder="Начало" />
        <input v-model="endDate" type="date" placeholder="Конец" />
      </div>
    </div>
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="byCategory.length === 0" class="empty">
      Нет трат за выбранный период
    </div>
    <div v-else>
      <div class="total-row">
        <div v-if="periodLabel" class="total-period">{{ periodLabel }}</div>
        <div class="total-sum">Итого: {{ totalInDefault }} {{ defaultCurrency }}</div>
      </div>
      <div v-if="byCurrency.length > 0" class="by-currency-wrap">
        <div class="currency-title">По валютам</div>
        <div v-for="c in byCurrency" :key="c.currency" class="currency-row">
          <span>{{ c.currency }}</span>
          <span>{{ c.amount }} {{ c.currency }}</span>
        </div>
      </div>
      <AnalyticsChart
        :labels="byCategory.map((x) => x.category)"
        :data="byCategory.map((x) => parseFloat(x.amount))"
      />
      <div class="category-list">
        <div v-for="c in byCategory" :key="c.category" class="row">
          <span>{{ c.category }}</span>
          <span>{{ c.amount }} {{ defaultCurrency }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.analytics-controls select {
  padding: 12px 16px;
  font-size: 15px;
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--tg-theme-secondary-bg-color, #f0f2f5);
  color: var(--tg-theme-text-color);
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238b949e' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;
}
.period-dates {
  display: flex;
  gap: 8px;
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
.total-row {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--tg-theme-secondary-bg-color, #f0f2f5);
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.total-period {
  font-size: 13px;
  color: var(--tg-theme-hint-color, #65676b);
  margin-bottom: 4px;
}
.total-sum {
  font-size: 15px;
  font-weight: 700;
}
.by-currency-wrap {
  margin-bottom: 16px;
}
.currency-title {
  font-size: 13px;
  color: var(--tg-theme-hint-color);
  margin-bottom: 8px;
}
.currency-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--tg-theme-hint-color);
}
.category-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.category-list .row {
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--tg-theme-secondary-bg-color, #f0f2f5);
  border-radius: 8px;
  font-size: 14px;
}
</style>
