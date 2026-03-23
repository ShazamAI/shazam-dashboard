<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { TaskStatus, AgentStatus } from '@/types';

interface Props {
  status: TaskStatus | AgentStatus;
}

const props = defineProps<Props>();

// Track status changes for flash animation
const isTransitioning = ref(false);
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.status, () => {
  isTransitioning.value = true;
  if (transitionTimer) clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => {
    isTransitioning.value = false;
  }, 400);
});

const statusConfig = computed(() => {
  const map: Record<string, { label: string; classes: string; dotClass: string }> = {
    // Task statuses
    pending:            { label: 'Pending',           classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',  dotClass: 'bg-yellow-400' },
    in_progress:        { label: 'In Progress',       classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20',        dotClass: 'bg-blue-400 animate-pulse' },
    completed:          { label: 'Completed',         classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dotClass: 'bg-emerald-400' },
    failed:             { label: 'Failed',            classes: 'bg-red-500/10 text-red-400 border-red-500/20',           dotClass: 'bg-red-500' },
    awaiting_approval:  { label: 'Awaiting',          classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20',  dotClass: 'bg-purple-400' },
    // Agent statuses
    idle:               { label: 'Idle',              classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dotClass: 'bg-emerald-400' },
    busy:               { label: 'Working',           classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    dotClass: 'bg-amber-400 animate-pulse' },
    paused:             { label: 'Paused',            classes: 'bg-gray-500/10 text-gray-500 border-gray-600/20',        dotClass: 'bg-gray-500' },
    working:            { label: 'Working',           classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    dotClass: 'bg-amber-400 animate-pulse' },
    executing:          { label: 'Executing',         classes: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',        dotClass: 'bg-cyan-400 animate-pulse' },
    waiting:            { label: 'Waiting',           classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',  dotClass: 'bg-yellow-400 animate-pulse' },
    error:              { label: 'Error',             classes: 'bg-red-500/10 text-red-400 border-red-500/20',           dotClass: 'bg-red-500 animate-pulse' },
    offline:            { label: 'Offline',           classes: 'bg-gray-800/50 text-gray-600 border-gray-700/20',        dotClass: 'bg-gray-600' },
  };
  return map[props.status] ?? { label: props.status, classes: 'bg-gray-500/10 text-gray-400 border-gray-500/20', dotClass: 'bg-gray-500' };
});
</script>

<template>
  <span
    class="status-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all duration-300"
    :class="[statusConfig.classes, isTransitioning ? 'status-flash' : '']"
  >
    <span
      class="h-1.5 w-1.5 rounded-full transition-colors duration-300"
      :class="statusConfig.dotClass"
    />
    {{ statusConfig.label }}
  </span>
</template>

<style scoped>
.status-flash {
  animation: statusFlash 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes statusFlash {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  30% {
    transform: scale(1.08);
    filter: brightness(1.3);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}
</style>
