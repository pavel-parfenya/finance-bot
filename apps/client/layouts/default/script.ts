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
      return "table";
    });

    const isSettingsRoute = computed(() => route.path.startsWith("/settings"));

    const showSettingsBack = computed(() => /^\/settings\/.+/.test(route.path));

    const pageTitle = computed(() => {
      const p = route.path;
      if (p === "/settings" || p === "/settings/") return "Настройки";
      if (p.startsWith("/settings/help")) return "Справка";
      if (p.startsWith("/settings/expenses")) return "Траты";
      if (p.startsWith("/settings/analytics")) return "Аналитика";
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
      showSettingsBack,
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
