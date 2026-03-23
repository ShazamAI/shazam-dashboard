<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import AppLayout from '@/components/layouts/AppLayout.vue';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useWebSocket } from '@/composables/useWebSocket';

const { loadCompanies } = useActiveCompany();
const ws = useWebSocket();

// ─── Auto-load & keep company state fresh ─────────────────
// 1. Load on startup (immediate)
// 2. Poll every 30s as fallback for backend changes
// 3. Listen for WebSocket events that signal company changes

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
