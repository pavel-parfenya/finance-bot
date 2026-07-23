import { defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { DebtUpdateRequest } from "@finance-bot/shared";
import { CURRENCIES } from "~/utils/format";
import { updateDebt } from "~/api/client";
import { useAppState } from "~/composables/useAppState";

export default defineComponent({
  setup() {
    const router = useRouter();
    const { editingDebt, triggerRefresh } = useAppState();
    const debt = editingDebt.value;

    const name = ref(debt ? (debt.isCreditor ? debt.debtorName : debt.creditorName) : "");
    const linkedUsername = ref(
      debt
        ? debt.isCreditor
          ? debt.debtorUsername
            ? `@${debt.debtorUsername}`
            : ""
          : debt.creditorUsername
            ? `@${debt.creditorUsername}`
            : ""
        : ""
    );
    const amount = ref(debt ? String(debt.amount) : "");
    const currency = ref((debt?.currency || "BYN").toUpperCase());
    const repaid = ref(debt ? String(debt.repaidAmount ?? 0) : "");
    const deadline = ref(debt?.deadline ?? "");
    const saving = ref(false);
    const error = ref<string | null>(null);
    const tooltipOpen = ref(false);

    const usernameLabel = debt?.isCreditor
      ? "Привязать должника (@username)"
      : "Привязать кредитора (@username)";

    onMounted(() => {
      // Прямой заход на /debts/edit без выбранного долга (например, перезагрузка) —
      // возвращаем к списку.
      if (!editingDebt.value) router.replace("/debts");
    });

    function goBack() {
      editingDebt.value = null;
      router.push("/debts");
    }

    async function save() {
      if (!debt || saving.value) return;
      saving.value = true;
      error.value = null;

      const updates: DebtUpdateRequest = {
        amount: parseFloat(amount.value) || debt.amount,
        currency: (currency.value.trim() || "BYN").toUpperCase(),
        deadline: deadline.value || null,
        repaidAmount: parseFloat(repaid.value) || 0,
      };

      const username = linkedUsername.value.trim();
      if (debt.isCreditor) {
        updates.debtorName = name.value.trim() || debt.debtorName;
        updates.debtorUsername = username || null;
      } else {
        updates.creditorName = name.value.trim() || debt.creditorName;
        updates.creditorUsername = username || null;
      }

      const data = await updateDebt(debt.id, updates);
      saving.value = false;
      if (data.error) {
        error.value = data.error;
        return;
      }
      triggerRefresh();
      goBack();
    }

    return {
      name,
      linkedUsername,
      amount,
      currency,
      repaid,
      deadline,
      saving,
      error,
      tooltipOpen,
      usernameLabel,
      save,
      goBack,
      CURRENCIES,
    };
  },
});
