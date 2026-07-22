import { defineComponent, ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import type {
  AdminGiftSubscriptionPeriod,
  AdminTelegramUserOption,
} from "@finance-bot/shared";
import {
  fetchUserSettings,
  fetchAdminTelegramUsers,
  grantAdminSubscription,
} from "~/api/client";

const PERIOD_OPTIONS: { value: AdminGiftSubscriptionPeriod; label: string }[] = [
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
  { value: "lifetime", label: "Пожизненно" },
];

export default defineComponent({
  setup() {
    const router = useRouter();
    const allowed = ref(false);
    const loaded = ref(false);
    const loadError = ref<string | null>(null);
    const users = ref<AdminTelegramUserOption[]>([]);
    const search = ref("");
    const selectedUserId = ref("");
    const period = ref<AdminGiftSubscriptionPeriod>("month");
    const submitError = ref<string | null>(null);
    const sending = ref(false);
    const sentOk = ref(false);

    const filteredUsers = computed(() => {
      const q = search.value.trim().toLowerCase();
      if (!q) return users.value;
      return users.value.filter((u) => {
        const uname = (u.username ?? "").toLowerCase();
        return uname.includes(q) || u.displayName.toLowerCase().includes(q);
      });
    });

    onMounted(async () => {
      const s = await fetchUserSettings();
      if (!s.isSuperAdmin) {
        await router.replace("/settings");
        return;
      }
      allowed.value = true;
      const data = await fetchAdminTelegramUsers();
      if (data.error) {
        loadError.value = data.error;
      } else {
        users.value = data.users ?? [];
      }
      loaded.value = true;
    });

    async function submit(): Promise<void> {
      submitError.value = null;
      sentOk.value = false;
      const uid = parseInt(selectedUserId.value, 10);
      if (!Number.isFinite(uid) || uid <= 0) {
        submitError.value = "Выберите пользователя";
        return;
      }
      sending.value = true;
      try {
        const res = await grantAdminSubscription({ userId: uid, period: period.value });
        if (res.error) {
          submitError.value = res.error;
          return;
        }
        sentOk.value = true;
        selectedUserId.value = "";
        search.value = "";
      } finally {
        sending.value = false;
      }
    }

    return {
      allowed,
      loaded,
      loadError,
      filteredUsers,
      search,
      selectedUserId,
      period,
      periodOptions: PERIOD_OPTIONS,
      submitError,
      sending,
      sentOk,
      submit,
    };
  },
});
