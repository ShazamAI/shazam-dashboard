<script setup lang="ts">
import type { SessionRow } from '@/composables/useSessions';
import { agentInitials, agentColor, formatIdleTime } from '@/composables/useSessions';

interface Props {
  session: SessionRow;
  nowMs: number;
  animationDelay: number;
}

defineProps<Props>();
</script>

<template>
  <div
    class="idle-row flex flex-col gap-2 px-4 py-3.5 transition-colors duration-200 hover:bg-gray-800/20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4"
    :style="{ animationDelay: `${animationDelay}ms` }"
  >
    <!-- Left: avatar + info -->
    <div class="flex items-center gap-3">
      <div
        class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ring-1"
        :class="[agentColor(session.agent_name, true).bg, agentColor(session.agent_name, true).text, agentColor(session.agent_name, true).ring]"
      >
        {{ agentInitials(session.agent_name) }}
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-gray-300">{{ session.agent_name }}</p>
        <p class="text-[10px] text-gray-600">
          {{ session.task_count }} task{{ session.task_count !== 1 ? 's' : '' }} completed
        </p>
      </div>
    </div>

    <!-- Right: idle time + badge -->
    <div class="flex items-center justify-end gap-3 ml-auto sm:gap-4">
      <div class="text-left sm:text-right">
        <p class="micro-label">Last active</p>
        <p class="text-xs font-medium tabular-nums text-gray-400">{{ formatIdleTime(session.last_used, nowMs) }}</p>
      </div>
      <span class="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-700/40 bg-gray-800/50 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
        <span class="h-1.5 w-1.5 rounded-full bg-gray-600" />
        Idle
      </span>
    </div>
  </div>
</template>

<style scoped>
.idle-row {
  animation: rowSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
