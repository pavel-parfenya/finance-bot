import { defineComponent, ref, watch } from "vue";
import { CURRENCIES } from "~/utils/format";
import { fetchUserSettings, updateUserSettings } from "~/api/client";

const VOICE_OPTIONS = [
  { value: "official", label: "Официальный" },
  { value: "strict", label: "Строгий" },
  { value: "modern", label: "Современный" },
  { value: "modern_18", label: "Современный 18+" },
] as const;

export default defineComponent({
  props: {
    open: { type: Boolean, required: true },
  },
  emits: ["close", "settings-changed"],
  setup(props, { emit }) {
    const defaultCurrency = ref("");
    const analyticsEnabled = ref(true);
    const analyticsVoice = ref("official");

    watch(
      () => props.open,
      async (open) => {
        if (open) {
          const data = await fetchUserSettings();
          if (!data.error) {
            defaultCurrency.value = data.defaultCurrency ?? "";
            analyticsEnabled.value = data.analyticsEnabled ?? true;
            analyticsVoice.value = data.analyticsVoice ?? "official";
          }
        }
      }
    );

    async function onCurrencyChange() {
      const data = await updateUserSettings({ defaultCurrency: defaultCurrency.value });
      if (data.error) alert(data.error);
      else emit("settings-changed");
    }

    async function onAnalyticsChange() {
      const data = await updateUserSettings({ analyticsEnabled: analyticsEnabled.value });
      if (data.error) alert(data.error);
      else emit("settings-changed");
    }

    async function onVoiceChange() {
      const data = await updateUserSettings({ analyticsVoice: analyticsVoice.value });
      if (data.error) alert(data.error);
      else emit("settings-changed");
    }

    return {
      defaultCurrency,
      analyticsEnabled,
      analyticsVoice,
      onCurrencyChange,
      onAnalyticsChange,
      onVoiceChange,
      emit,
      CURRENCIES,
      VOICE_OPTIONS,
    };
  },
});
