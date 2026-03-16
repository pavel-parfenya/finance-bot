<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { WorkspaceMember } from "@finance-bot/shared";
import { fetchWorkspaceInfo, inviteUser } from "@/api/client";

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
  load();
}

onMounted(load);
</script>

<template>
  <div>
    <div v-if="isOwner" class="invite-owner">
      <div class="invite-form">
        <input
          v-model="inviteUsername"
          type="text"
          placeholder="@username"
          autocomplete="off"
        />
        <button type="button" :disabled="inviting" @click="doInvite">Пригласить</button>
      </div>
      <div class="invite-hint">Участник должен сначала написать боту /start</div>
    </div>
    <div v-else class="invite-only">
      {{ error || "Приглашать участников может только владелец" }}
    </div>
    <div v-if="members.length > 0" class="members-list-wrap">
      <h4 class="members-title">Участники</h4>
      <div class="members-list">
        <div v-for="m in members" :key="m.userId" class="member-row">
          <span>{{ m.username ? `@${m.username}` : "Пользователь" }}</span>
          <span v-if="m.role === 'owner'" class="role-badge">Владелец</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invite-form {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  min-width: 0;
}
.invite-form input {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  font-size: 15px;
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--tg-theme-secondary-bg-color);
  color: var(--tg-theme-text-color);
}
.invite-form button {
  flex-shrink: 0;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  border: none;
  border-radius: var(--radius);
  background: var(--tg-theme-button-color, #238636);
  color: var(--tg-theme-button-text-color, #fff);
  cursor: pointer;
}
.invite-form button:active {
  opacity: 0.9;
}
.invite-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.invite-hint {
  font-size: 13px;
  color: var(--tg-theme-hint-color);
  margin-top: 8px;
}
.invite-only {
  color: var(--tg-theme-hint-color);
  font-size: 14px;
  margin-bottom: 16px;
}
.members-list-wrap {
  margin-top: 20px;
}
.members-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--tg-theme-hint-color);
}
.members-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.member-row {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: var(--tg-theme-secondary-bg-color, #f0f2f5);
  border-radius: 8px;
  font-size: 14px;
}
.role-badge {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 8px;
}
</style>
