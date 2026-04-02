<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AppLayout from '@/components/layouts/AppLayout.vue';
import SpotlightSearch from '@/components/common/SpotlightSearch.vue';
import DaemonStartup from '@/components/common/DaemonStartup.vue';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useRealtimeSync } from '@/composables/useRealtimeSync';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';

const daemonReady = ref(false);
const { loadCompanies } = useActiveCompany();

// Initialize global real-time sync (WebSocket → all stores, all pages)
useRealtimeSync();

// Register global keyboard shortcuts (Cmd+1..5 for navigation)
useKeyboardShortcuts();

let pollTimer: ReturnType<typeof setInterval> | null = null;

function onDaemonReady() {
  daemonReady.value = true;
  loadCompanies();
  pollTimer = setInterval(() => loadCompanies(), 30_000);
}

onMounted(() => {
  // loadCompanies is now called when daemon is ready
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <DaemonStartup v-if="!daemonReady" @ready="onDaemonReady" />
  <template v-else>
    <AppLayout />
    <SpotlightSearch />
  </template>
</template>
