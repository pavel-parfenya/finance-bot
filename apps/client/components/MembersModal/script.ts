import { defineComponent, ref, watch } from "vue";
import type { WorkspaceMember } from "@finance-bot/shared";
import { fetchWorkspaceInfo, inviteUser } from "~/api/client";

export default defineComponent({
  props: {
    open: { type: Boolean, required: true },
  },
  emits: ["close", "members-changed"],
  setup(props, { emit }) {
    const isOwner = ref(false);
    const members = ref<WorkspaceMember[]>([]);
    const error = ref<string | null>(null);
    const inviteUsername = ref("");
    const inviting = ref(false);

    async function load() {
      const data = await fetchWorkspaceInfo();
      if (data.error) {
        error.value = data.error;
        isOwner.value = false;
        members.value = [];
        return;
      }
      isOwner.value = data.isOwner ?? false;
      members.value = data.members ?? [];
      error.value = null;
    }

    async function doInvite() {
      const username = inviteUsername.value.trim();
      if (!username) {
        alert("Введите @username");
        return;
      }
      inviting.value = true;
      const data = await inviteUser(username);
      inviting.value = false;
      if (data.error) {
        alert(data.error);
        return;
      }
      alert("Пользователь добавлен!");
      inviteUsername.value = "";
      await load();
      emit("members-changed");
    }

    watch(
      () => props.open,
      (open) => {
        if (open) load();
      }
    );

    return {
      isOwner,
      members,
      error,
      inviteUsername,
      inviting,
      doInvite,
      emit,
    };
  },
});
