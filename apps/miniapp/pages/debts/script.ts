import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from "vue";
import type { DebtDto, DebtCreateRequest, DebtUpdateRequest } from "@finance-bot/shared";
import {
  fetchDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  fetchUserSettings,
} from "~/api/client";
import { useAppState } from "~/composables/useAppState";
import { CURRENCIES } from "~/utils/format";

export default defineComponent({
  setup() {
    const { refreshTrigger } = useAppState();

    const debts = ref<DebtDto[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const showForm = ref(false);

    const formIAmCreditor = ref(true);
    const formName = ref("");
    const formAmount = ref("");
    const defaultCurrency = ref("BYN");
    const formCurrency = ref("BYN");
    const formDeadline = ref("");
    const formLinkedUsername = ref("");

    const editingDebt = ref<DebtDto | null>(null);
    const editName = ref("");
    const editAmount = ref("");
    const editCurrency = ref("BYN");
    const editDeadline = ref("");
    const editRepaid = ref("");
    const editLinkedUsername = ref("");

    const tooltipOpen = ref<"create" | "edit" | null>(null);
    let unbindClick: (() => void) | null = null;

    function toggleTooltip(which: "create" | "edit") {
      if (tooltipOpen.value === which) {
        tooltipOpen.value = null;
        unbindClick?.();
        unbindClick = null;
      } else {
        tooltipOpen.value = which;
        nextTick(() => {
          const handler = () => {
            tooltipOpen.value = null;
            document.removeEventListener("click", handler);
            unbindClick = null;
          };
          unbindClick = () => {
            document.removeEventListener("click", handler);
            unbindClick = null;
          };
          setTimeout(() => document.addEventListener("click", handler), 0);
        });
      }
    }

    const creditorDebts = computed(() => debts.value.filter((d) => d.isCreditor));
    const debtorDebts = computed(() => debts.value.filter((d) => !d.isCreditor));

    async function load() {
      loading.value = true;
      error.value = null;
      const data = await fetchDebts();
      loading.value = false;
      if (data.error) {
        error.value = data.error;
        return;
      }
      debts.value = data.debts ?? [];
    }

    async function submitDebt() {
      const name = formName.value.trim();
      if (!name || !formAmount.value) return;

      const body: DebtCreateRequest = {
        iAmCreditor: formIAmCreditor.value,
        debtorName: formIAmCreditor.value ? name : "",
        creditorName: formIAmCreditor.value ? "" : name,
        amount: parseFloat(formAmount.value) || 0,
        currency: formCurrency.value,
        deadline: formDeadline.value || null,
      };

      const username = formLinkedUsername.value.trim();
      if (formIAmCreditor.value) {
        body.debtorUsername = username || null;
      } else {
        body.creditorUsername = username || null;
      }

      const data = await createDebt(body);
      if (data.error) {
        alert(data.error);
        return;
      }
      showForm.value = false;
      formName.value = "";
      formAmount.value = "";
      formCurrency.value = defaultCurrency.value || "BYN";
      formDeadline.value = "";
      formLinkedUsername.value = "";
      await load();
    }

    function openEdit(d: DebtDto) {
      if (!d.isMain) return;
      editingDebt.value = d;
      editName.value = d.isCreditor ? d.debtorName : d.creditorName;
      editAmount.value = String(d.amount);
      editCurrency.value = d.currency || defaultCurrency.value || "BYN";
      editDeadline.value = d.deadline ?? "";
      editRepaid.value = String(d.repaidAmount ?? 0);
      editLinkedUsername.value = d.isCreditor
        ? d.debtorUsername
          ? `@${d.debtorUsername}`
          : ""
        : d.creditorUsername
          ? `@${d.creditorUsername}`
          : "";
    }

    function closeEdit() {
      editingDebt.value = null;
    }

    async function saveEdit() {
      const d = editingDebt.value;
      if (!d) return;

      const updates: DebtUpdateRequest = {
        amount: parseFloat(editAmount.value) || d.amount,
        currency: editCurrency.value,
        deadline: editDeadline.value || null,
        repaidAmount: parseFloat(editRepaid.value) || 0,
      };

      const username = editLinkedUsername.value.trim();
      if (d.isCreditor) {
        updates.debtorName = editName.value.trim() || d.debtorName;
        updates.debtorUsername = username || null;
      } else {
        updates.creditorName = editName.value.trim() || d.creditorName;
        updates.creditorUsername = username || null;
      }

      const data = await updateDebt(d.id, updates);
      if (data.error) {
        alert(data.error);
        return;
      }
      closeEdit();
      await load();
    }

    async function removeDebt(id: number) {
      if (!confirm("Удалить запись?")) return;
      const data = await deleteDebt(id);
      if (data.error) {
        alert(data.error);
        return;
      }
      debts.value = debts.value.filter((d) => d.id !== id);
    }

    async function loadDefaultCurrency() {
      const data = await fetchUserSettings();
      if (!data.error && data.defaultCurrency) {
        defaultCurrency.value = data.defaultCurrency;
      }
    }

    onMounted(() => {
      load();
      loadDefaultCurrency();
    });
    watch(refreshTrigger, load);
    watch(showForm, (open) => {
      if (open) {
        formCurrency.value = defaultCurrency.value || "BYN";
      }
    });
    onUnmounted(() => {
      unbindClick?.();
    });

    return {
      debts,
      loading,
      error,
      showForm,
      formIAmCreditor,
      formName,
      formAmount,
      formCurrency,
      formDeadline,
      formLinkedUsername,
      creditorDebts,
      debtorDebts,
      editingDebt,
      editName,
      editAmount,
      editCurrency,
      editDeadline,
      editRepaid,
      editLinkedUsername,
      submitDebt,
      openEdit,
      closeEdit,
      saveEdit,
      removeDebt,
      tooltipOpen,
      toggleTooltip,
      CURRENCIES,
    };
  },
});
