<script setup lang="ts">
import type { AgentStats } from '@/composables/useAgentFilters';

defineProps<{
  stats: AgentStats;
}>();
</script>

<template>
  <div class="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-5 sm:gap-3">
    <div class="stats-card rounded-xl border border-gray-800/60 bg-gradient-to-br from-surface-card to-gray-900 p-3 sm:p-4">
      <div class="text-xl font-bold tabular-nums text-white sm:text-2xl">{{ stats.total }}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stats-card rounded-xl border border-shazam-500/20 bg-gradient-to-br from-shazam-500/5 to-surface-card p-3 sm:p-4">
      <div class="flex items-center gap-2">
        <div class="text-xl font-bold tabular-nums text-shazam-400 sm:text-2xl">{{ stats.active }}</div>
        <span v-if="stats.active > 0" class="h-2 w-2 animate-pulse rounded-full bg-shazam-400" />
      </div>
      <div class="stat-label">Active</div>
    </div>
    <div class="stats-card rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-surface-card p-3 sm:p-4">
      <div class="text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">{{ stats.idle }}</div>
      <div class="stat-label">Idle</div>
    </div>
    <div class="stats-card rounded-xl border border-gray-700/60 bg-gradient-to-br from-surface-card to-gray-900 p-3 sm:p-4">
      <div class="text-xl font-bold tabular-nums text-gray-500 sm:text-2xl">{{ stats.offline }}</div>
      <div class="stat-label">Offline</div>
    </div>
    <div class="stats-card rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-surface-card p-3 sm:p-4">
      <div class="text-xl font-bold tabular-nums text-red-400 sm:text-2xl">{{ stats.errors }}</div>
      <div class="stat-label">Errors</div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  animation: statsFadeIn 0.5s ease-out both;
}

.stats-card:nth-child(1) { animation-delay: 0ms; }
.stats-card:nth-child(2) { animation-delay: 60ms; }
.stats-card:nth-child(3) { animation-delay: 120ms; }
.stats-card:nth-child(4) { animation-delay: 180ms; }
.stats-card:nth-child(5) { animation-delay: 240ms; }

@keyframes statsFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
