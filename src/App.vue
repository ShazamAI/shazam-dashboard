<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import AppLayout from '@/components/layouts/AppLayout.vue';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useRealtimeSync } from '@/composables/useRealtimeSync';

const { loadCompanies } = useActiveCompany();

// Initialize global real-time sync (WebSocket → all stores, all pages)
useRealtimeSync();

let pollTimer: ReturnType<typeof setInterval> | null = null;

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
