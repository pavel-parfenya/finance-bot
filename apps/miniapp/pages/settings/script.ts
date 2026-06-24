import { defineComponent, ref, onMounted } from "vue";
import { useRuntimeConfig } from "#imports";
import { fetchUserSettings } from "~/api/client";

export default defineComponent({
  setup() {
    const config = useRuntimeConfig();
    const showSuperAdmin = ref(false);
    // Подписка зависит только от глобального режима оплаты — показываем сразу (как «Справка»),
    // не дожидаясь запроса settings. Сервер остаётся источником истины и корректирует значение.
    const showSubscription = ref(config.public.paymentMode !== "free");

    onMounted(async () => {
      const s = await fetchUserSettings();
      showSuperAdmin.value = !!s.isSuperAdmin;
      // Сервер уточняет видимость, но если ответ без поля (ошибка/сорванная сессия) —
      // оставляем значение из build-флага, чтобы пункт не пропадал после возврата
      // со страницы /subscribe.
      showSubscription.value = s.subscriptionEnabled ?? showSubscription.value;
    });

    return { showSuperAdmin, showSubscription };
  },
});
