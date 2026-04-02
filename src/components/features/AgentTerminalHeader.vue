<script setup lang="ts">
import type { AgentWorker } from '@/types';

defineProps<{
  currentAgent: AgentWorker | undefined;
  currentTask: string | null;
  autoScroll: boolean;
}>();

const emit = defineEmits<{
  toggleAutoScroll: [];
  clearOutput: [];
}>();
</script>

<template>
  <div class="flex items-center justify-between border-b border-gray-800 px-4 py-2.5 bg-gray-900/60">
    <div class="flex items-center gap-3">
      <!-- Traffic lights -->
      <div class="flex gap-1.5">
        <span class="h-3 w-3 rounded-full bg-red-500/80" />
        <span class="h-3 w-3 rounded-full bg-yellow-500/80" />
        <span class="h-3 w-3 rounded-full bg-green-500/80" />
      </div>

      <div v-if="currentAgent" class="flex items-center gap-2">
        <span class="text-sm font-semibold text-white">{{ currentAgent.name }}</span>
        <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
          {{ currentAgent.role }}
        </span>
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-medium"
          :class="{
            'bg-emerald-500/15 text-emerald-400': currentAgent.status === 'idle',
            'bg-shazam-500/15 text-shazam-400': ['busy', 'working', 'executing'].includes(currentAgent.status),
            'bg-red-500/15 text-red-400': currentAgent.status === 'error',
            'bg-gray-700/40 text-gray-500': currentAgent.status === 'offline',
            'bg-yellow-500/15 text-yellow-400': ['waiting', 'paused'].includes(currentAgent.status),
          }"
        >
          {{ currentAgent.status }}
        </span>
      </div>
      <span v-else class="text-sm text-gray-500">Select an agent</span>
    </div>

    <div class="flex items-center gap-2">
      <!-- Task badge -->
      <span
        v-if="currentTask"
        class="rounded-lg bg-shazam-500/10 px-2 py-1 text-[10px] font-mono text-shazam-400"
      >
        task: {{ currentTask }}
      </span>

      <!-- Auto-scroll indicator -->
      <button
        class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
        :class="{ 'text-shazam-400': autoScroll }"
        aria-label="Toggle auto-scroll"
        :aria-pressed="autoScroll"
        title="Auto-scroll"
        @click="emit('toggleAutoScroll')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      <!-- Clear -->
      <button
        class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
        aria-label="Clear terminal"
        title="Clear output"
        @click="emit('clearOutput')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  </div>
</template>
