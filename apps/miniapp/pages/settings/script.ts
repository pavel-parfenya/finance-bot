import { defineComponent, ref, onMounted } from "vue";
import { useRuntimeConfig } from "#imports";
import { fetchUserSettings } from "~/api/client";

export default defineComponent({
  setup() {
    const config = useRuntimeConfig();
    const showSuperAdmin = ref(false);
    // Подписка зависит только от глобального режима оплаты — показываем сразу (как «Справка»),
    // не дожидаясь запроса settings. Сервер остаётся источником истины и корректирует значение.
    const showSubscription = ref(config.public.paymentMode === "paid");

    onMounted(async () => {
      const s = await fetchUserSettings();
      showSuperAdmin.value = !!s.isSuperAdmin;
      showSubscription.value = !!s.subscriptionEnabled;
    });

    return { showSuperAdmin, showSubscription };
  },
});
