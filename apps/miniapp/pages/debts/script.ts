import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from "vue";
import type { DebtDto, DebtCreateRequest } from "@finance-bot/shared";
import { useRouter } from "vue-router";
import { fetchDebts, createDebt, deleteDebt, fetchUserSettings } from "~/api/client";
import { useAppState } from "~/composables/useAppState";
import { useUpgradeModal } from "~/composables/useUpgradeModal";
import { useFeatures } from "~/composables/useFeatures";
import { CURRENCIES } from "~/utils/format";

export default defineComponent({
  setup() {
    const router = useRouter();
    const { refreshTrigger, editingDebt } = useAppState();
    const { notifyApiError, openUpgrade } = useUpgradeModal();
    const { ensureLoaded, hasFeature } = useFeatures();

    // Создание новых долгов — платная фича. Старые остаются полностью рабочими
    // (просмотр/редактирование/закрытие).
    const debtsLocked = computed(() => !hasFeature("debts"));

    function onAddClick() {
      if (debtsLocked.value) {
        openUpgrade("Добавление долгов доступно на платном тарифе.");
        return;
      }
      showForm.value = !showForm.value;
    }

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
        notifyApiError(data.error);
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
      router.push("/debts/edit");
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
      ensureLoaded();
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
      debtsLocked,
      onAddClick,
      formIAmCreditor,
      formName,
      formAmount,
      formCurrency,
      formDeadline,
      formLinkedUsername,
      creditorDebts,
      debtorDebts,
      submitDebt,
      openEdit,
      removeDebt,
      tooltipOpen,
      toggleTooltip,
      CURRENCIES,
    };
  },
});
