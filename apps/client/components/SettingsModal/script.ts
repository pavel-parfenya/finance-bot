import { defineComponent, ref, watch } from "vue";
import { CURRENCIES } from "~/utils/format";
import { fetchUserSettings, setDefaultCurrency } from "~/api/client";

export default defineComponent({
  props: {
    open: { type: Boolean, required: true },
  },
  emits: ["close", "settings-changed"],
  setup(props, { emit }) {
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

    return {
      defaultCurrency,
      onCurrencyChange,
      emit,
      CURRENCIES,
    };
  },
});
