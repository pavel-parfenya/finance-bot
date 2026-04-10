import { defineComponent, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import type { AdminTelegramUserOption } from "@finance-bot/shared";
import {
  fetchUserSettings,
  fetchAdminTelegramUsers,
  sendAdminTelegramMessage,
} from "~/api/client";

export default defineComponent({
  setup() {
    const router = useRouter();
    const allowed = ref(false);
    const users = ref<AdminTelegramUserOption[]>([]);
    const loadError = ref<string | null>(null);
    const selectedUserId = ref("");
    const messageText = ref("");
    const submitError = ref<string | null>(null);
    const sending = ref(false);
    const loaded = ref(false);
    const sentOk = ref(false);

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

    async function submit() {
      submitError.value = null;
      sentOk.value = false;
      const uid = parseInt(selectedUserId.value, 10);
      if (!Number.isFinite(uid) || uid <= 0) {
        submitError.value = "Выберите пользователя";
        return;
      }
      const text = messageText.value.trim();
      if (!text) {
        submitError.value = "Введите сообщение";
        return;
      }
      sending.value = true;
      try {
        const res = await sendAdminTelegramMessage(uid, messageText.value);
        if (res.error) {
          submitError.value = res.error;
          return;
        }
        messageText.value = "";
        selectedUserId.value = "";
        sentOk.value = true;
      } finally {
        sending.value = false;
      }
    }

    return {
      allowed,
      users,
      loadError,
      selectedUserId,
      messageText,
      submitError,
      sending,
      loaded,
      sentOk,
      submit,
    };
  },
});
