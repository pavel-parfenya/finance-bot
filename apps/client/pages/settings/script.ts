import { defineComponent, ref, onMounted } from "vue";
import { fetchUserSettings } from "~/api/client";

export default defineComponent({
  setup() {
    const showAppStats = ref(false);

    onMounted(async () => {
      const s = await fetchUserSettings();
      showAppStats.value = !!s.isSuperAdmin;
    });

    return { showAppStats };
  },
});
