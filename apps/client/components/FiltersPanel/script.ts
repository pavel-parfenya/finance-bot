import { defineComponent, ref, watch } from "vue";
import type { TransactionFilters } from "@finance-bot/shared";
import { CURRENCIES, getDefaultPeriodDates } from "~/utils/format";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as () => TransactionFilters,
      required: true,
    },
    categories: { type: Array as () => string[], default: () => [] },
    members: {
      type: Array as () => Array<{
        userId: number;
        username: string | null;
      }>,
      default: () => [],
    },
  },
  emits: ["update:modelValue", "apply"],
  setup(props, { emit }) {
    const local = ref<TransactionFilters>({ ...props.modelValue });

    watch(
      () => props.modelValue,
      (v) => {
        local.value = { ...v };
      },
      { deep: true }
    );

    function normalizeFilters(v: TransactionFilters): TransactionFilters {
      const out = { ...v };
      if (out.userId === "" || out.userId === undefined) out.userId = undefined;
      else out.userId = Number(out.userId);
      return out;
    }

    function reset() {
      local.value = {
        period: "all",
        startDate: undefined,
        endDate: undefined,
        category: undefined,
        currency: undefined,
        userId: undefined,
        search: undefined,
      };
      const v = normalizeFilters(local.value);
      emit("update:modelValue", v);
      emit("apply", v);
    }

    function apply() {
      const v = normalizeFilters({ ...local.value });
      emit("update:modelValue", v);
      emit("apply", v);
    }

    function showPeriodDates() {
      return local.value.period === "period";
    }

    function setDefaultPeriod() {
      const { start, end } = getDefaultPeriodDates();
      local.value = { ...local.value, startDate: start, endDate: end };
    }

    return {
      local,
      reset,
      apply,
      showPeriodDates,
      setDefaultPeriod,
      CURRENCIES,
    };
  },
});
