<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import AppLayout from '@/components/layouts/AppLayout.vue';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useWebSocket } from '@/composables/useWebSocket';
import { useTaskStore } from '@/stores/tasks';
import { useAgentStore } from '@/stores/agents';

const { loadCompanies, activeCompany } = useActiveCompany();
const ws = useWebSocket();
const taskStore = useTaskStore();
const agentStore = useAgentStore();

let pollTimer: ReturnType<typeof setInterval> | null = null;

const COMPANY_EVENTS = new Set([
  'company_started',
  'company_stopped',
  'company_switched',
  'company_updated',
  'company_status_change',
]);

ws.on('*', (event) => {
  if (COMPANY_EVENTS.has(event.type)) {
    loadCompanies();
  }
});

// When active project changes: re-subscribe + reload all data
watch(
  () => activeCompany.value?.name,
  async (name, oldName) => {
    if (name && name !== oldName) {
      // Subscribe to this project's events
      ws.subscribeToProject(name);

      // Reload stores for the new project context
      await Promise.allSettled([
        taskStore.load(),
        agentStore.load(name),
      ]);
    }
  },
  { immediate: true }
);

onMounted(() => {
  loadCompanies();
  pollTimer = setInterval(() => loadCompanies(), 30_000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <AppLayout />
</template>
