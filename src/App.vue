<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import AppLayout from '@/components/layouts/AppLayout.vue';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useWebSocket } from '@/composables/useWebSocket';

const { loadCompanies, activeCompany } = useActiveCompany();
const ws = useWebSocket();

// ─── Auto-load & keep company state fresh ─────────────────
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

// Subscribe to active project when it changes
watch(
  () => activeCompany.value?.name,
  (name) => {
    if (name) {
      ws.subscribeToProject(name);
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
