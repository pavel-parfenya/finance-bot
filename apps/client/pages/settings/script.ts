import { defineComponent, ref, onMounted } from "vue";
import { fetchUserSettings } from "~/api/client";

export default defineComponent({
  setup() {
    const showSuperAdmin = ref(false);

    onMounted(async () => {
      const s = await fetchUserSettings();
      showSuperAdmin.value = !!s.isSuperAdmin;
    });

    return { showSuperAdmin };
  },
});
