import { defineComponent, ref, onMounted } from "vue";
import { fetchUserSettings, updateUserSettings } from "~/api/client";
import { useAppState } from "~/composables/useAppState";

const VOICE_OPTIONS = [
  { value: "official", label: "Официальный" },
  { value: "strict", label: "Строгий" },
  { value: "modern", label: "Современный" },
  { value: "modern_18", label: "Современный 18+" },
] as const;

/** IANA; подпись — как в Telegram/жизни пользователя. */
const TIMEZONE_OPTIONS = [
  { value: "Europe/Kaliningrad", label: "Калининград" },
  { value: "Europe/Moscow", label: "Москва" },
  { value: "Europe/Samara", label: "Самара" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург" },
  { value: "Asia/Omsk", label: "Омск" },
  { value: "Asia/Krasnoyarsk", label: "Красноярск" },
  { value: "Asia/Irkutsk", label: "Иркутск" },
  { value: "Asia/Yakutsk", label: "Якутск" },
  { value: "Asia/Vladivostok", label: "Владивосток" },
  { value: "Europe/Minsk", label: "Минск" },
  { value: "Europe/Kiev", label: "Киев" },
  { value: "Europe/Warsaw", label: "Варшава" },
  { value: "Europe/Berlin", label: "Берлин" },
  { value: "Europe/London", label: "Лондон" },
  { value: "Asia/Tbilisi", label: "Тбилиси" },
  { value: "Asia/Almaty", label: "Алматы" },
  { value: "Asia/Tashkent", label: "Ташкент" },
  { value: "UTC", label: "UTC" },
] as const;

export default defineComponent({
  setup() {
    const { triggerRefresh } = useAppState();

    const analyticsReminderEod = ref(false);
    const analyticsMonthReport = ref(false);
    const analyticsForecastWeekly = ref(false);
    const analyticsTimezone = ref("Europe/Moscow");
    const analyticsVoice = ref("official");

    async function load() {
      const data = await fetchUserSettings();
      if (!data.error) {
        analyticsReminderEod.value = data.analyticsReminderEod ?? false;
        analyticsMonthReport.value = data.analyticsMonthReport ?? false;
        analyticsForecastWeekly.value = data.analyticsForecastWeekly ?? false;
        analyticsTimezone.value = data.analyticsTimezone ?? "Europe/Moscow";
        analyticsVoice.value = data.analyticsVoice ?? "official";
      }
    }

    onMounted(() => {
      load();
    });

    async function patchPartial(updates: Parameters<typeof updateUserSettings>[0]) {
      const data = await updateUserSettings(updates);
      if (data.error) alert(data.error);
      else triggerRefresh();
    }

    async function onReminderChange() {
      await patchPartial({ analyticsReminderEod: analyticsReminderEod.value });
    }

    async function onMonthReportChange() {
      await patchPartial({ analyticsMonthReport: analyticsMonthReport.value });
    }

    async function onForecastChange() {
      await patchPartial({ analyticsForecastWeekly: analyticsForecastWeekly.value });
    }

    async function onTimezoneChange() {
      await patchPartial({ analyticsTimezone: analyticsTimezone.value });
    }

    async function onVoiceChange() {
      await patchPartial({ analyticsVoice: analyticsVoice.value });
    }

    return {
      analyticsReminderEod,
      analyticsMonthReport,
      analyticsForecastWeekly,
      analyticsTimezone,
      analyticsVoice,
      onReminderChange,
      onMonthReportChange,
      onForecastChange,
      onTimezoneChange,
      onVoiceChange,
      VOICE_OPTIONS,
      TIMEZONE_OPTIONS,
    };
  },
});
