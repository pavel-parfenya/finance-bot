import { defineComponent, ref, onMounted } from "vue";
import { fetchUserSettings, updateUserSettings } from "~/api/client";
import { useAppState } from "~/composables/useAppState";

const VOICE_OPTIONS = [
  { value: "official", label: "Официальный" },
  { value: "strict", label: "Строгий" },
  { value: "modern", label: "Современный" },
  { value: "modern_18", label: "Современный 18+" },
] as const;

export default defineComponent({
  setup() {
    const { triggerRefresh } = useAppState();

    const analyticsEnabled = ref(false);
    const analyticsVoice = ref("official");

    async function load() {
      const data = await fetchUserSettings();
      if (!data.error) {
        analyticsEnabled.value = data.analyticsEnabled ?? false;
        analyticsVoice.value = data.analyticsVoice ?? "official";
      }
    }

    onMounted(() => {
      load();
    });

    async function onAnalyticsChange() {
      const data = await updateUserSettings({ analyticsEnabled: analyticsEnabled.value });
      if (data.error) alert(data.error);
      else triggerRefresh();
    }

    async function onVoiceChange() {
      const data = await updateUserSettings({ analyticsVoice: analyticsVoice.value });
      if (data.error) alert(data.error);
      else triggerRefresh();
    }

    return {
      analyticsEnabled,
      analyticsVoice,
      onAnalyticsChange,
      onVoiceChange,
      VOICE_OPTIONS,
    };
  },
});
