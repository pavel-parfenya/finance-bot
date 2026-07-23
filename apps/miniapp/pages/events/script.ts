import { defineComponent, ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import type { EventDto, EventCreateRequest } from "@finance-bot/shared";
import { fetchEvents, createEvent, fetchUserSettings } from "~/api/client";
import { useAppState } from "~/composables/useAppState";
import { useUpgradeModal } from "~/composables/useUpgradeModal";
import { useFeatures } from "~/composables/useFeatures";
import { CURRENCIES } from "~/utils/format";

export default defineComponent({
  setup() {
    const router = useRouter();
    const { refreshTrigger } = useAppState();
    const { notifyApiError, openUpgrade } = useUpgradeModal();
    const { ensureLoaded, hasFeature } = useFeatures();

    // Создание событий — фича тарифа PRO.
    const eventsLocked = computed(() => !hasFeature("events"));

    const events = ref<EventDto[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const showForm = ref(false);

    const formName = ref("");
    const formDescription = ref("");
    const formKeywords = ref("");
    const defaultCurrency = ref("BYN");
    const formCurrency = ref("BYN");
    const submitting = ref(false);

    function onAddClick() {
      if (eventsLocked.value) {
        openUpgrade("Создание событий доступно на тарифе PRO.");
        return;
      }
      showForm.value = !showForm.value;
    }

    async function load() {
      loading.value = true;
      error.value = null;
      const data = await fetchEvents();
      loading.value = false;
      if (data.error) {
        error.value = data.error;
        return;
      }
      events.value = data.events ?? [];
    }

    async function submitCreate() {
      const name = formName.value.trim();
      if (!name || submitting.value) return;
      submitting.value = true;

      const body: EventCreateRequest = {
        name,
        description: formDescription.value.trim(),
        keywords: formKeywords.value.trim(),
        currency: formCurrency.value,
      };
      const data = await createEvent(body);
      submitting.value = false;
      if (data.error) {
        notifyApiError(data.error);
        return;
      }
      showForm.value = false;
      formName.value = "";
      formDescription.value = "";
      formKeywords.value = "";
      if (data.event) {
        router.push(`/events/${data.event.id}`);
      } else {
        await load();
      }
    }

    function openEvent(id: number) {
      router.push(`/events/${id}`);
    }

    function formatMoney(n: number, currency: string): string {
      return `${(n ?? 0).toLocaleString("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} ${currency}`;
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

    return {
      events,
      loading,
      error,
      showForm,
      eventsLocked,
      onAddClick,
      formName,
      formDescription,
      formKeywords,
      formCurrency,
      submitting,
      submitCreate,
      openEvent,
      formatMoney,
      CURRENCIES,
    };
  },
});
