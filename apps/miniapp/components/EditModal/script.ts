import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
    const type = ref<"expense" | "income">("expense");

    // Привязываем оверлей к видимой области (visualViewport), чтобы при
    // открытии клавиатуры модалка ужималась над ней, а не пряталась под неё.
    const viewportHeight = ref(0);
    const viewportTop = ref(0);

    function syncViewport() {
      const vv = window.visualViewport;
      if (vv) {
        viewportHeight.value = vv.height;
        viewportTop.value = vv.offsetTop;
      } else {
        viewportHeight.value = window.innerHeight;
        viewportTop.value = 0;
      }
    }

    const overlayStyle = computed(() =>
      viewportHeight.value
        ? {
            height: `${viewportHeight.value}px`,
            top: `${viewportTop.value}px`,
          }
        : {}
    );

    onMounted(() => {
      syncViewport();
      const vv = window.visualViewport;
      if (vv) {
        vv.addEventListener("resize", syncViewport);
        vv.addEventListener("scroll", syncViewport);
      }
      window.addEventListener("resize", syncViewport);
    });

    onBeforeUnmount(() => {
      const vv = window.visualViewport;
      if (vv) {
        vv.removeEventListener("resize", syncViewport);
        vv.removeEventListener("scroll", syncViewport);
      }
      window.removeEventListener("resize", syncViewport);
    });

    watch(
      () => props.transaction,
      (t) => {
        description.value = t.description ?? "";
        category.value = t.category ?? "";
        amount.value = t.amount ?? "";
        currency.value = (t.currency ?? "BYN").toUpperCase();
        type.value = t.type === "income" ? "income" : "expense";
        const d = new Date((t.date ?? "").toString());
        date.value = !isNaN(d.getTime())
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          : "";
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
        type: type.value,
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
      type,
      save,
      emit,
      overlayStyle,
      CURRENCIES,
    };
  },
});
