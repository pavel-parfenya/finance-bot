import { defineComponent, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { fetchUserSettings } from "~/api/client";

export default defineComponent({
  setup() {
    const router = useRouter();
    const allowed = ref(false);

    onMounted(async () => {
      const s = await fetchUserSettings();
      if (!s.isSuperAdmin) {
        await router.replace("/settings");
        return;
      }
      allowed.value = true;
    });

    return { allowed };
  },
});
