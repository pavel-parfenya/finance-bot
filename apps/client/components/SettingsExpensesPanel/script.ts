import { defineComponent, ref, onMounted } from "vue";
import { CURRENCIES } from "~/utils/format";
import type { CustomCategoryDto } from "@finance-bot/shared";
import {
  fetchUserSettings,
  updateUserSettings,
  fetchCustomCategories,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  fetchWorkspaceInfo,
} from "~/api/client";
import { useAppState } from "~/composables/useAppState";

export default defineComponent({
  setup() {
    const { triggerRefresh } = useAppState();

    const defaultCurrency = ref("");
    const categories = ref<CustomCategoryDto[]>([]);
    const currentUserId = ref(0);
    const isOwner = ref(false);

    const showAddForm = ref(false);
    const newCatName = ref("");
    const newCatDesc = ref("");
    const addLoading = ref(false);

    const editingId = ref<number | null>(null);
    const editName = ref("");
    const editDesc = ref("");
    const editLoading = ref(false);

    async function load() {
      editingId.value = null;
      showAddForm.value = false;
      const [settingsData, catsData, wsData] = await Promise.all([
        fetchUserSettings(),
        fetchCustomCategories(),
        fetchWorkspaceInfo(),
      ]);
      if (!settingsData.error) {
        defaultCurrency.value = settingsData.defaultCurrency ?? "";
      }
      categories.value = catsData.categories ?? [];
      currentUserId.value = wsData.userId ?? 0;
      isOwner.value = wsData.isOwner ?? false;
    }

    onMounted(() => {
      load();
    });

    async function onCurrencyChange() {
      const data = await updateUserSettings({ defaultCurrency: defaultCurrency.value });
      if (data.error) alert(data.error);
      else triggerRefresh();
    }

    function canEditCategory(cat: CustomCategoryDto): boolean {
      return isOwner.value || cat.createdByUserId === currentUserId.value;
    }

    async function addCategory() {
      if (!newCatName.value.trim()) return;
      addLoading.value = true;
      const result = await createCustomCategory({
        name: newCatName.value,
        description: newCatDesc.value,
      });
      addLoading.value = false;
      if (result.error) {
        alert(result.error);
        return;
      }
      if (result.category) {
        categories.value.push(result.category);
      }
      newCatName.value = "";
      newCatDesc.value = "";
      showAddForm.value = false;
    }

    function startEdit(cat: CustomCategoryDto) {
      editingId.value = cat.id;
      editName.value = cat.name;
      editDesc.value = cat.description;
    }

    function cancelEdit() {
      editingId.value = null;
    }

    async function saveEdit() {
      if (editingId.value === null || !editName.value.trim()) return;
      editLoading.value = true;
      const result = await updateCustomCategory(editingId.value, {
        name: editName.value,
        description: editDesc.value,
      });
      editLoading.value = false;
      if (result.error) {
        alert(result.error);
        return;
      }
      if (result.category) {
        const idx = categories.value.findIndex((c) => c.id === editingId.value);
        if (idx !== -1) categories.value[idx] = result.category;
      }
      editingId.value = null;
    }

    async function removeCategory(id: number) {
      const result = await deleteCustomCategory(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      categories.value = categories.value.filter((c) => c.id !== id);
    }

    return {
      defaultCurrency,
      categories,
      showAddForm,
      newCatName,
      newCatDesc,
      addLoading,
      editingId,
      editName,
      editDesc,
      editLoading,
      canEditCategory,
      onCurrencyChange,
      addCategory,
      startEdit,
      cancelEdit,
      saveEdit,
      removeCategory,
      CURRENCIES,
    };
  },
});
