<script setup lang="ts">
import type { AgentWorker } from '@/types';
import { getStatusColor } from '@/composables/useAgentOutput';

defineProps<{
  agents: AgentWorker[];
  selectedAgent: string | null;
  agentHasOutput: Record<string, number>;
}>();

const emit = defineEmits<{
  selectAgent: [name: string];
}>();
</script>

<template>
  <div class="w-64 shrink-0 overflow-y-auto rounded-2xl border border-gray-800 bg-surface-card p-3">
    <h2 class="mb-3 text-sm font-semibold text-white tracking-wide uppercase">Agents</h2>

    <div v-if="agents.length === 0" class="py-8 text-center text-xs text-gray-500">
      No agents loaded
    </div>

    <div class="space-y-1">
      <button
        v-for="agent in agents"
        :key="agent.name"
        class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-150"
        :class="selectedAgent === agent.name
          ? 'bg-shazam-500/15 border border-shazam-500/30 text-white'
          : 'hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-transparent'"
        :aria-label="`Select agent ${agent.name}`"
        :aria-pressed="selectedAgent === agent.name"
        @click="emit('selectAgent', agent.name)"
      >
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :class="getStatusColor(agent.status)"
        />
        <div class="min-w-0 flex-1">
          <div class="truncate text-xs font-medium">{{ agent.name }}</div>
          <div class="truncate text-[10px] text-gray-500">{{ agent.role }}</div>
        </div>
        <span
          v-if="agentHasOutput[agent.name]"
          class="shrink-0 rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400"
        >
          {{ agentHasOutput[agent.name] }}
        </span>
      </button>
    </div>
  </div>
</template>
