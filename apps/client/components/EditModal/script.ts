import { defineComponent, ref, watch } from "vue";
import type { TransactionDto, TransactionUpdateRequest } from "@finance-bot/shared";
import { CURRENCIES } from "~/utils/format";
import { updateTransaction } from "~/api/client";

export default defineComponent({
  props: {
    transaction: { type: Object as () => TransactionDto, required: true },
  },
  emits: ["close", "saved"],
  setup(props, { emit }) {
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

    return {
      description,
      category,
      amount,
      currency,
      date,
      save,
      emit,
      CURRENCIES,
    };
  },
});
