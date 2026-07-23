import { defineComponent, ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import type {
  EventDetailDto,
  EventTransactionDto,
  TransactionDto,
} from "@finance-bot/shared";
import {
  fetchEvent,
  updateEvent,
  deleteEvent,
  inviteToEvent,
  leaveEvent,
  removeEventMember,
  setEventTransactionExcluded,
  deleteEventTransaction,
  settleEvent,
  createDebtFromSettlement,
  linkTransactionToEvent,
  fetchTransactions,
} from "~/api/client";
import { formatMoney } from "~/utils/money";

export default defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const eventId = computed(() => parseInt(String(route.params.id), 10));

    const event = ref<EventDetailDto | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const busy = ref(false);

    // Активная вкладка на странице события (по умолчанию — «Все траты»).
    const activeTab = ref<"members" | "my" | "all" | "settlement">("all");
    let tabInitialized = false;
    const hasSettlement = computed(() => (event.value?.settlement?.length ?? 0) > 0);

    // Редактирование информации
    const showEdit = ref(false);
    const editName = ref("");
    const editDescription = ref("");
    const editKeywords = ref("");

    // Приглашение
    const showInvite = ref(false);
    const inviteUsername = ref("");

    // Привязка существующей траты
    const showLink = ref(false);
    const linkCandidates = ref<TransactionDto[]>([]);
    const linkLoading = ref(false);

    const isCreator = computed(() => event.value?.isCreator ?? false);
    const isActive = computed(() => event.value?.status === "active");
    const myUserId = computed(
      () => event.value?.members.find((m) => m.isMe)?.userId ?? null
    );
    const myOwedRows = computed(
      () => event.value?.settlement?.filter((r) => r.fromUserId === myUserId.value) ?? []
    );

    async function load() {
      loading.value = true;
      error.value = null;
      const data = await fetchEvent(eventId.value);
      loading.value = false;
      if (data.error || !data.event) {
        error.value = data.error ?? "Событие не найдено";
        return;
      }
      event.value = data.event;
      // При первой загрузке рассчитанного события открываем «Итог».
      if (!tabInitialized) {
        tabInitialized = true;
        if (hasSettlement.value) activeTab.value = "settlement";
      }
    }

    function openEdit() {
      if (!event.value) return;
      editName.value = event.value.name;
      editDescription.value = event.value.description;
      editKeywords.value = event.value.keywords;
      showEdit.value = true;
    }

    async function saveInfo() {
      if (!event.value || busy.value) return;
      busy.value = true;
      const data = await updateEvent(eventId.value, {
        name: editName.value.trim(),
        description: editDescription.value.trim(),
        keywords: editKeywords.value.trim(),
      });
      busy.value = false;
      if (data.error) {
        alert(data.error);
        return;
      }
      if (data.event) event.value = data.event;
      showEdit.value = false;
    }

    async function doInvite() {
      const uname = inviteUsername.value.trim();
      if (!uname || busy.value) return;
      busy.value = true;
      const data = await inviteToEvent(eventId.value, uname);
      busy.value = false;
      if (data.error) {
        alert(data.error);
        return;
      }
      inviteUsername.value = "";
      showInvite.value = false;
      alert("Приглашение отправлено.");
    }

    async function kickMember(userId: number) {
      if (!confirm("Исключить участника из события?")) return;
      const data = await removeEventMember(eventId.value, userId);
      if (data.error) {
        alert(data.error);
        return;
      }
      await load();
    }

    async function doLeave() {
      if (!confirm("Выйти из события? Ваши траты будут отвязаны от него.")) return;
      const data = await leaveEvent(eventId.value);
      if (data.error) {
        alert(data.error);
        return;
      }
      router.push("/events");
    }

    async function removeEvent() {
      if (!confirm("Удалить событие? Траты участников останутся в их учёте.")) return;
      const data = await deleteEvent(eventId.value);
      if (data.error) {
        alert(data.error);
        return;
      }
      router.push("/events");
    }

    async function toggleExclude(tx: EventTransactionDto) {
      const data = await setEventTransactionExcluded(
        eventId.value,
        tx.id,
        !tx.excludedFromEvent
      );
      if (data.error) {
        alert(data.error);
        return;
      }
      await load();
    }

    async function removeTx(tx: EventTransactionDto) {
      if (!confirm("Удалить эту трату? Она удалится и из ваших трат.")) return;
      const data = await deleteEventTransaction(eventId.value, tx.id);
      if (data.error) {
        alert(data.error);
        return;
      }
      await load();
    }

    async function doSettle() {
      if (!confirm("Завершить событие и рассчитать? После этого траты нельзя менять."))
        return;
      busy.value = true;
      const data = await settleEvent(eventId.value);
      busy.value = false;
      if (data.error) {
        alert(data.error);
        return;
      }
      if (data.event) event.value = data.event;
      activeTab.value = "settlement";
    }

    async function makeDebt(toUserId: number) {
      if (busy.value) return;
      busy.value = true;
      const data = await createDebtFromSettlement(eventId.value, toUserId);
      if (data.error) {
        busy.value = false;
        alert(data.error);
        return;
      }
      await load(); // обновляем settlement — строка получит debtCreated
      busy.value = false;
      alert("Долг создан. Кредитор получит уведомление для подтверждения.");
    }

    // --- Ручная привязка траты ---
    async function openLink() {
      showLink.value = true;
      linkLoading.value = true;
      const linkedIds = new Set(event.value?.allTransactions.map((t) => t.id) ?? []);
      const data = await fetchTransactions(undefined, { limit: 30, offset: 0 });
      linkLoading.value = false;
      if ("transactions" in data && data.transactions) {
        linkCandidates.value = data.transactions.filter((t) => !linkedIds.has(t.id));
      } else {
        linkCandidates.value = [];
      }
    }

    async function doLink(txId: number) {
      const data = await linkTransactionToEvent(eventId.value, txId);
      if (data.error) {
        alert(data.error);
        return;
      }
      showLink.value = false;
      await load();
    }

    onMounted(load);

    return {
      event,
      loading,
      error,
      busy,
      activeTab,
      hasSettlement,
      isCreator,
      isActive,
      myUserId,
      myOwedRows,
      showEdit,
      editName,
      editDescription,
      editKeywords,
      openEdit,
      saveInfo,
      showInvite,
      inviteUsername,
      doInvite,
      kickMember,
      doLeave,
      removeEvent,
      toggleExclude,
      removeTx,
      doSettle,
      makeDebt,
      showLink,
      linkCandidates,
      linkLoading,
      openLink,
      doLink,
      formatMoney,
    };
  },
});
