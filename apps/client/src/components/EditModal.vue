<script setup lang="ts">
import { ref, watch } from "vue";
import type { TransactionDto, TransactionUpdateRequest } from "@finance-bot/shared";
import { CURRENCIES } from "@/utils/format";
import { updateTransaction } from "@/api/client";

const props = defineProps<{
  transaction: TransactionDto;
}>();

const emit = defineEmits<{
  close: [];
  saved: [tx: TransactionDto];
}>();

const description = ref("");
const category = ref("");
const amount = ref("");
const currency = ref("");
const date = ref("");

watch(
  () => props.transaction,
  (t) => {
    description.value = t.description ?? "";
    category.value = t.category ?? "";
    amount.value = t.amount ?? "";
    currency.value = (t.currency ?? "BYN").toUpperCase();
    const d = (t.date ?? "").toString().split("T")[0];
    date.value = d ?? "";
  },
  { immediate: true }
);

async function save() {
  const payload: TransactionUpdateRequest = {
    description: description.value.trim(),
    category: category.value.trim(),
    amount: parseFloat(amount.value) || 0,
    currency: (currency.value.trim() || "BYN").toUpperCase(),
    date: date.value || new Date().toISOString().split("T")[0],
  };
  const data = await updateTransaction(props.transaction.id, payload);
  if (data.error) {
    alert(data.error);
    return;
  }
  if (data.transaction) emit("saved", data.transaction);
  emit("close");
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h3>Изменить запись</h3>
      <label>Описание</label>
      <input v-model="description" type="text" placeholder="Описание" />
      <label>Категория</label>
      <input v-model="category" type="text" placeholder="Категория" />
      <label>Сумма</label>
      <input v-model="amount" type="number" step="0.01" min="0" placeholder="0" />
      <label>Валюта</label>
      <select v-model="currency" class="select-styled">
        <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
      </select>
      <label>Дата</label>
      <input v-model="date" type="date" />
      <div class="modal-actions">
        <button type="button" class="btn-cancel" @click="emit('close')">Отмена</button>
        <button type="button" class="btn-save" @click="save">Сохранить</button>
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
.modal h3 {
  margin: 0 0 16px;
  font-size: 18px;
}
.modal label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--tg-theme-hint-color);
}
.modal input {
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
  font-size: 15px;
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
  margin-bottom: 12px;
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.modal-actions button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 15px;
}
.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: var(--tg-theme-text-color);
}
.btn-save {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
}
</style>
