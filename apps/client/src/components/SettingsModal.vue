<script setup lang="ts">
import { ref, watch } from "vue";
import { CURRENCIES } from "@/utils/format";
import { fetchUserSettings, setDefaultCurrency } from "@/api/client";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "settings-changed": [];
}>();

const defaultCurrency = ref("");

watch(
  () => props.open,
  async (open) => {
    if (open) {
      const data = await fetchUserSettings();
      if (!data.error) defaultCurrency.value = data.defaultCurrency ?? "";
    }
  }
);

async function onCurrencyChange() {
  const data = await setDefaultCurrency(defaultCurrency.value);
  if (data.error) alert(data.error);
  else emit("settings-changed");
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>Настройки</h3>
        <button type="button" class="btn-close" title="Закрыть" @click="emit('close')">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="settings-block">
        <label for="default-currency">Валюта по умолчанию</label>
        <select
          id="default-currency"
          v-model="defaultCurrency"
          class="select-styled"
          @change="onCurrencyChange"
        >
          <option value="">Не задана</option>
          <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
        </select>
        <div class="settings-hint">
          Используется при редактировании записей и новых тратах
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}
.modal {
  background: var(--tg-theme-bg-color, #fff);
  border-radius: var(--radius);
  padding: 20px;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
}
.btn-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  cursor: pointer;
  color: var(--tg-theme-hint-color);
}
.btn-close svg {
  width: 16px;
  height: 16px;
}
.settings-block {
  margin-bottom: 12px;
}
.settings-block label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}
.select-styled {
  width: 100%;
  padding: 12px 40px 12px 16px;
  font-size: 15px;
  border-radius: var(--radius);
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: var(--tg-theme-secondary-bg-color, #f0f2f5);
  color: var(--tg-theme-text-color);
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2365676b' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  cursor: pointer;
}
.settings-hint {
  font-size: 13px;
  color: var(--tg-theme-hint-color);
  margin-top: 8px;
}
</style>
