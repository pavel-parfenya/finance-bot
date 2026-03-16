<script setup lang="ts">
import { ref, computed } from "vue";
import type { TransactionFilters } from "@finance-bot/shared";
import TableView from "@/views/TableView.vue";
import AnalyticsView from "@/views/AnalyticsView.vue";
import InviteView from "@/views/InviteView.vue";
import SettingsModal from "@/components/SettingsModal.vue";

type Tab = "table" | "analytics" | "invite";

const activeTab = ref<Tab>("table");
const settingsOpen = ref(false);
const filtersOpen = ref(false);
const filters = ref<TransactionFilters>({});

const activeFiltersCount = computed(() => {
  let n = 0;
  if (filters.value.period && filters.value.period !== "all") n++;
  if (filters.value.category) n++;
  if (filters.value.userId) n++;
  if (filters.value.currency) n++;
  if (filters.value.search?.trim()) n++;
  return n;
});

function setTab(t: Tab) {
  activeTab.value = t;
  if (t !== "table") filtersOpen.value = false;
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Мои расходы</h1>
      <button
        type="button"
        class="btn-settings"
        title="Настройки"
        @click="settingsOpen = true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
      </button>
    </header>

    <div class="tabs-row">
      <button
        v-if="activeTab === 'table'"
        type="button"
        class="btn-filters-icon"
        title="Фильтры"
        :aria-expanded="filtersOpen"
        @click="filtersOpen = !filtersOpen"
      >
        <svg
          class="btn-filters-icon-svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span v-if="activeFiltersCount > 0" class="btn-filters-badge">
          {{ activeFiltersCount }}
        </span>
      </button>
      <div class="tabs" :class="{ withFilters: activeTab === 'table' }">
        <button
          type="button"
          :class="['tab', { active: activeTab === 'table' }]"
          @click="setTab('table')"
        >
          Траты
        </button>
        <button
          type="button"
          :class="['tab', { active: activeTab === 'analytics' }]"
          @click="setTab('analytics')"
        >
          Аналитика
        </button>
        <button
          type="button"
          :class="['tab', { active: activeTab === 'invite' }]"
          @click="setTab('invite')"
        >
          Участники
        </button>
      </div>
    </div>

    <main class="content">
      <TableView
        v-show="activeTab === 'table'"
        v-model:filters="filters"
        v-model:filters-open="filtersOpen"
      />
      <AnalyticsView v-show="activeTab === 'analytics'" />
      <InviteView v-show="activeTab === 'invite'" />
    </main>

    <SettingsModal :open="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}
.btn-settings {
  padding: 8px;
  font-size: 20px;
  border: none;
  background: none;
  cursor: pointer;
  opacity: 0.7;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--tg-theme-hint-color);
}
.btn-settings svg {
  width: 20px;
  height: 20px;
}
.btn-settings:active {
  opacity: 1;
}
.tabs-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}
.tabs-row .tabs {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--tg-theme-secondary-bg-color, #f0f2f5);
  border-radius: var(--radius);
}
.btn-filters-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 18px;
  color: var(--tg-theme-button-color, #238636);
  background: var(--tg-theme-secondary-bg-color, rgba(35, 134, 54, 0.12));
  border: 1px solid rgba(35, 134, 54, 0.3);
  border-radius: var(--radius);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}
.btn-filters-icon:active {
  opacity: 0.9;
}
.btn-filters-icon-svg {
  width: 18px;
  height: 18px;
}
.btn-filters-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border-radius: 8px;
}
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 0;
  background: var(--tg-theme-secondary-bg-color, #f0f2f5);
  border-radius: var(--radius);
}
.tab {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--tg-theme-hint-color, #65676b);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.tab.active {
  background: var(--tg-theme-button-color, #238636);
  color: var(--tg-theme-button-text-color, #fff);
}
.content {
  min-height: 200px;
}
</style>
