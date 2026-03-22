import { defineComponent, ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useAppState } from "~/composables/useAppState";
import { fetchWorkspaceInfo } from "~/api/client";

export default defineComponent({
  setup() {
    const route = useRoute();
    const settingsOpen = ref(false);
    const membersOpen = ref(false);
    const infoOpen = ref(false);
    const showInfoBadge = ref(false);
    const totalMembers = ref(0);
    const { filtersOpen, activeFiltersCount, triggerRefresh } = useAppState();

    const activeTab = computed(() => {
      const path = route.path;
      if (path.startsWith("/analytics")) return "analytics";
      if (path.startsWith("/debts")) return "debts";
      return "table";
    });

    const otherMembersCount = computed(() => Math.max(0, totalMembers.value - 1));

    async function loadMembersCount() {
      const data = await fetchWorkspaceInfo();
      if (!data.error) {
        totalMembers.value = data.members?.length ?? 0;
      }
    }

    function onMembersChanged() {
      loadMembersCount();
      triggerRefresh();
    }

    onMounted(() => {
      loadMembersCount();
      showInfoBadge.value = !localStorage.getItem("info_seen");
    });

    watch(
      () => settingsOpen.value,
      (open) => {
        if (!open) loadMembersCount();
      }
    );

    function openInfo() {
      infoOpen.value = true;
      if (showInfoBadge.value) {
        showInfoBadge.value = false;
        localStorage.setItem("info_seen", "1");
      }
    }

    return {
      activeTab,
      settingsOpen,
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
