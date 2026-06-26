import { defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { TransactionUpdateRequest } from "@finance-bot/shared";
import { CURRENCIES } from "~/utils/format";
import { updateTransaction } from "~/api/client";
import { useAppState } from "~/composables/useAppState";

/** ISO/строка даты → значение для <input type="date"> (YYYY-MM-DD). */
function toDateInputValue(value: string | undefined): string {
  const d = new Date((value ?? "").toString());
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default defineComponent({
  setup() {
    const router = useRouter();
    const { editingTransaction } = useAppState();
    const tx = editingTransaction.value;

    const description = ref(tx?.description ?? "");
    const category = ref(tx?.category ?? "");
    const amount = ref(tx?.amount != null ? String(tx.amount) : "");
    const currency = ref((tx?.currency ?? "BYN").toUpperCase());
    const type = ref<"expense" | "income">(tx?.type === "income" ? "income" : "expense");
    const date = ref(toDateInputValue(tx?.date));
    const saving = ref(false);
    const error = ref<string | null>(null);

    onMounted(() => {
      // Прямой заход на /table/edit без выбранной записи (например, перезагрузка) —
      // возвращаем к списку.
      if (!editingTransaction.value) router.replace("/table");
    });

    function goBack() {
      editingTransaction.value = null;
      router.push("/table");
    }

    async function save() {
      if (!tx || saving.value) return;
      saving.value = true;
      error.value = null;
      const payload: TransactionUpdateRequest = {
        description: description.value.trim(),
        category: category.value.trim(),
        amount: parseFloat(amount.value) || 0,
        currency: (currency.value.trim() || "BYN").toUpperCase(),
        date: date.value || new Date().toISOString().split("T")[0],
        type: type.value,
      };
      const data = await updateTransaction(tx.id, payload);
      saving.value = false;
      if (data.error) {
        error.value = data.error;
        return;
      }
      goBack();
    }

    return {
      description,
      category,
      amount,
      currency,
      date,
      type,
      saving,
      error,
      save,
      goBack,
      CURRENCIES,
    };
  },
});
