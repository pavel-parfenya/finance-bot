import { defineComponent, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import type {
  AdminTelegramUserOption,
  AdminUndeliveredRecipient,
} from "@finance-bot/shared";
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
    const sentSummary = ref<string | null>(null);
    const sendToAll = ref(false);
    const undeliveredList = ref<AdminUndeliveredRecipient[]>([]);

    async function refreshUsers() {
      const data = await fetchAdminTelegramUsers();
      if (!data.error) users.value = data.users ?? [];
    }

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
      sentSummary.value = null;
      undeliveredList.value = [];
      const text = messageText.value.trim();
      if (!text) {
        submitError.value = "Введите сообщение";
        return;
      }
      if (!sendToAll.value) {
        const uid = parseInt(selectedUserId.value, 10);
        if (!Number.isFinite(uid) || uid <= 0) {
          submitError.value = "Выберите пользователя";
          return;
        }
      }
      sending.value = true;
      try {
        const uid = parseInt(selectedUserId.value, 10);
        const res = await sendAdminTelegramMessage({
          text: messageText.value,
          sendToAll: sendToAll.value,
          ...(sendToAll.value ? {} : { userId: uid }),
        });
        if (res.error) {
          submitError.value = res.error;
          undeliveredList.value = res.undelivered ?? [];
          if (undeliveredList.value.length) await refreshUsers();
          return;
        }
        messageText.value = "";
        selectedUserId.value = "";
        sentOk.value = true;
        undeliveredList.value = res.undelivered ?? [];
        if (sendToAll.value && res.sent != null) {
          const f = res.failed ?? 0;
          sentSummary.value =
            f > 0
              ? `Отправлено: ${res.sent}, не доставлено: ${f} (переведены в архив бота).`
              : `Отправлено всем: ${res.sent}.`;
        } else {
          sentSummary.value = null;
        }
        if (undeliveredList.value.length || sendToAll.value) await refreshUsers();
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
      sentSummary,
      sendToAll,
      undeliveredList,
      submit,
    };
  },
});
