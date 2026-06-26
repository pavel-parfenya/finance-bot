import { defineComponent, ref, onMounted, onBeforeUnmount } from "vue";
import { fetchCheckoutLink } from "~/api/client";
import { useUpgradeModal } from "~/composables/useUpgradeModal";

export default defineComponent({
  setup() {
    const { open, message, close } = useUpgradeModal();
    const loading = ref(false);
    const error = ref("");

    // «Сменить план» уводит WebView на /subscribe и НЕ сбрасывает loading
    // (мы уходим со страницы). При возврате «Назад» WebView восстанавливает
    // страницу из bfcache с замороженным loading=true — снимаем его, чтобы
    // кнопка снова была активной и с текстом «Сменить план».
    function resetOnReturn(): void {
      loading.value = false;
    }
    onMounted(() => {
      window.addEventListener("pageshow", resetOnReturn);
    });
    onBeforeUnmount(() => {
      window.removeEventListener("pageshow", resetOnReturn);
    });

    /**
     * «Сменить план» — получаем ссылку и уводим текущую WebView на `/subscribe`
     * внутри Telegram (так же, как кнопка на странице «Подписка»).
     */
    async function changePlan(): Promise<void> {
      if (loading.value) return;
      loading.value = true;
      error.value = "";
      const res = await fetchCheckoutLink();
      if ("error" in res) {
        loading.value = false;
        error.value = res.error;
        return;
      }
      // loading не сбрасываем: WebView уходит на страницу подписки.
      window.location.assign(res.url);
    }

    return { open, message, close, loading, error, changePlan };
  },
});
