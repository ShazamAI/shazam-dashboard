<script setup lang="ts">
import { computed } from 'vue';
import type { AgentWorker } from '@/types';

interface Props {
  agents: AgentWorker[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [agentName: string];
}>();

function statusDotClass(status: string): string {
  switch (status) {
    case 'idle': return 'bg-emerald-400';
    case 'busy':
    case 'working': return 'bg-amber-400 animate-pulse';
    case 'executing': return 'bg-cyan-400 animate-pulse';
    case 'waiting': return 'bg-yellow-400 animate-pulse';
    case 'paused': return 'bg-gray-500';
    case 'error': return 'bg-red-500';
    case 'offline': return 'bg-gray-600';
    default: return 'bg-gray-500';
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    pm: 'PM',
    senior_dev: 'Senior',
    junior_dev: 'Junior',
    qa: 'QA',
    designer: 'Design',
    researcher: 'Research',
    devops: 'DevOps',
    writer: 'Writer',
    pr_reviewer: 'Review',
  };
  return map[role] ?? role;
}

const activeCount = computed(() =>
  props.agents.filter((a) => ['busy', 'working', 'executing'].includes(a.status)).length
);
</script>

<template>
  <div v-if="agents.length > 0" class="agent-list card overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
      <h3 class="text-sm font-semibold text-white">Agents</h3>
      <div class="flex items-center gap-2">
        <span v-if="activeCount > 0" class="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
          <span class="h-1 w-1 animate-pulse rounded-full bg-amber-400" />
          {{ activeCount }} active
        </span>
        <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
          {{ agents.length }}
        </span>
      </div>
    </div>

    <!-- Agent rows -->
    <div class="divide-y divide-gray-800/40">
      <button
        v-for="agent in agents"
        :key="agent.name"
        class="agent-row group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 hover:bg-gray-800/40"
        @click="emit('select', agent.name)"
      >
        <!-- Status dot -->
        <span
          class="h-2 w-2 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125"
          :class="statusDotClass(agent.status)"
        />

        <!-- Name -->
        <span class="min-w-0 flex-1 truncate text-xs font-medium text-gray-300 transition-colors duration-200 group-hover:text-shazam-400">
          {{ agent.name }}
        </span>

        <!-- Role badge -->
        <span class="shrink-0 rounded-md bg-gray-800/80 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 transition-colors duration-200 group-hover:text-gray-400">
          {{ roleLabel(agent.role) }}
        </span>

        <!-- Arrow on hover -->
        <svg
          class="h-3 w-3 shrink-0 text-gray-700 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.agent-list {
  animation: listIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes listIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.agent-row {
  animation: rowIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.agent-row:nth-child(1) { animation-delay: 50ms; }
.agent-row:nth-child(2) { animation-delay: 80ms; }
.agent-row:nth-child(3) { animation-delay: 110ms; }
.agent-row:nth-child(4) { animation-delay: 140ms; }
.agent-row:nth-child(5) { animation-delay: 170ms; }
.agent-row:nth-child(6) { animation-delay: 200ms; }

@keyframes rowIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
