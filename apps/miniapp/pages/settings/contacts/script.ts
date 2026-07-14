import { defineComponent, ref, computed, onMounted } from "vue";
import { fetchContacts } from "~/api/client";

export default defineComponent({
  name: "SettingsContactsPage",
  setup() {
    const loading = ref(true);
    const error = ref<string | null>(null);
    const email = ref<string | null>(null);
    const telegramSupport = ref<string | null>(null);

    const telegramLabel = computed(() =>
      telegramSupport.value ? `@${telegramSupport.value}` : null
    );
    const telegramHref = computed(() =>
      telegramSupport.value ? `https://t.me/${telegramSupport.value}` : null
    );
    const emailHref = computed(() => (email.value ? `mailto:${email.value}` : null));

    onMounted(async () => {
      const data = await fetchContacts();
      email.value = data.email;
      telegramSupport.value = data.telegramSupport;
      if (data.error && !data.email && !data.telegramSupport) {
        error.value = data.error;
      }
      loading.value = false;
    });

    return { loading, error, email, emailHref, telegramLabel, telegramHref };
  },
});
