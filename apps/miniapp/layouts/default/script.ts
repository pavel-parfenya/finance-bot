import { defineComponent, ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useAppState } from "~/composables/useAppState";
import { fetchWorkspaceInfo, markInfoChangelogSeen } from "~/api/client";

export default defineComponent({
  setup() {
    const route = useRoute();
    const membersOpen = ref(false);
    const infoOpen = ref(false);
    const showInfoBadge = ref(false);
    const totalMembers = ref(0);
    const { filtersOpen, activeFiltersCount, triggerRefresh } = useAppState();

    const activeTab = computed(() => {
      const path = route.path;
      if (path.startsWith("/settings")) return "settings";
      if (path.startsWith("/analytics")) return "analytics";
      if (path.startsWith("/debts")) return "debts";
      if (path.startsWith("/events")) return "events";
      return "table";
    });

    const isSettingsRoute = computed(() => route.path.startsWith("/settings"));

    const isEditRoute = computed(
      () => route.path.startsWith("/table/edit") || route.path.startsWith("/debts/edit")
    );

    /** Цель кнопки «назад» в шапке (null — кнопку не показываем). */
    const backTarget = computed(() => {
      if (/^\/settings\/.+/.test(route.path)) return "/settings";
      if (route.path.startsWith("/debts/edit")) return "/debts";
      if (route.path.startsWith("/table/edit")) return "/table";
      if (/^\/events\/.+/.test(route.path)) return "/events";
      return null;
    });

    const pageTitle = computed(() => {
      const p = route.path;
      if (p.startsWith("/table/edit")) return "Изменить запись";
      if (p.startsWith("/debts/edit")) return "Изменить долг";
      if (p === "/settings" || p === "/settings/") return "Настройки";
      if (p.startsWith("/settings/help")) return "Справка";
      if (p.startsWith("/settings/contacts")) return "Контакты";
      if (p.startsWith("/settings/expenses")) return "Траты";
      if (p.startsWith("/settings/analytics")) return "Аналитика";
      if (p.startsWith("/settings/subscription")) return "Подписка";
      if (p.startsWith("/settings/app-stats")) return "Статистика приложения";
      if (p.startsWith("/settings/bepaid-subscriptions")) return "Подписки bePaid";
      if (p.startsWith("/settings/send-message")) return "Сообщение от бота";
      if (p.startsWith("/events")) return "События";
      return "Мои расходы";
    });

    const otherMembersCount = computed(() => Math.max(0, totalMembers.value - 1));

    async function loadMembersCount() {
      const data = await fetchWorkspaceInfo();
      if (!data.error) {
        totalMembers.value = data.members?.length ?? 0;
        const current = data.infoChangelogVersion ?? 0;
        const seen = data.infoChangelogSeenVersion ?? 0;
        showInfoBadge.value = current > 0 && seen < current;
      }
    }

    function onMembersChanged() {
      loadMembersCount();
      triggerRefresh();
    }

    onMounted(() => {
      loadMembersCount();
    });

    watch(
      () => route.path,
      (p) => {
        if (p.startsWith("/settings/help")) {
          void (async () => {
            const res = await markInfoChangelogSeen();
            if (!res.error) {
              await loadMembersCount();
            }
          })();
        }
      },
      { immediate: true }
    );

    async function openInfo() {
      infoOpen.value = true;
      if (showInfoBadge.value) {
        showInfoBadge.value = false;
        const res = await markInfoChangelogSeen();
        if (res.error) {
          showInfoBadge.value = true;
        }
      }
    }

    return {
      activeTab,
      isSettingsRoute,
      isEditRoute,
      backTarget,
      pageTitle,
      membersOpen,
      infoOpen,
      showInfoBadge,
      openInfo,
      otherMembersCount,
      filtersOpen,
      activeFiltersCount,
      triggerRefresh,
      onMembersChanged,
    };
  },
});
