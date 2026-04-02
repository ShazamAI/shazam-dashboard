<script setup lang="ts">
import { formatTimelineTime } from '@/utils/formatters';
import { getLineColor, getLinePrefix } from '@/composables/useAgentOutput';
import type { OutputLine } from '@/composables/useAgentOutput';

defineProps<{
  line: OutputLine;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  toggleTool: [lineId: string];
}>();
</script>

<template>
  <div class="group">
    <!-- User message line -->
    <div v-if="line.type === 'user_message'" class="flex items-start gap-2 rounded px-3 py-1 bg-shazam-500/5 border-l-2 border-shazam-500">
      <span class="shrink-0 w-16 text-gray-600 select-none text-[10px]">{{ formatTimelineTime(line.timestamp) }}</span>
      <span class="text-[10px] text-shazam-400 font-medium shrink-0">You</span>
      <span class="text-sm text-shazam-300">{{ line.content }}</span>
    </div>

    <!-- Standard line -->
    <div
      v-else
      class="flex gap-2 rounded px-2 py-0.5 hover:bg-gray-900/60"
      :class="{ 'animate-pulse': line.isStreaming }"
    >
      <span class="shrink-0 w-16 text-gray-600 select-none">{{ formatTimelineTime(line.timestamp) }}</span>
      <span class="shrink-0 w-3 select-none" :class="getLineColor(line.type)">{{ getLinePrefix(line.type) }}</span>
      <span class="flex-1 break-words whitespace-pre-wrap" :class="getLineColor(line.type)">
        {{ line.content }}
        <span v-if="line.isStreaming" class="inline-block h-3 w-1.5 animate-pulse bg-shazam-400 ml-0.5" />
      </span>

      <!-- Tool expand button -->
      <button
        v-if="line.type === 'tool_use' || line.type === 'tool_result'"
        class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-gray-600 hover:text-gray-300"
        :aria-label="isExpanded ? 'Collapse tool details' : 'Expand tool details'"
        @click="emit('toggleTool', line.id)"
      >
        <svg
          class="h-3.5 w-3.5 transition-transform duration-200"
          :class="{ 'rotate-90': isExpanded }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>

    <!-- Collapsible tool details -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-96"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 max-h-96"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-if="isExpanded && (line.toolInput || line.toolResult)"
        class="ml-[5.5rem] mt-1 mb-2 overflow-hidden rounded-lg border border-gray-800 bg-gray-900/80"
      >
        <div v-if="line.toolInput" class="border-b border-gray-800 p-2">
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Input</div>
          <pre class="text-[10px] text-purple-300/80 whitespace-pre-wrap break-all">{{ line.toolInput }}</pre>
        </div>
        <div v-if="line.toolResult" class="p-2">
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Result</div>
          <pre class="text-[10px] text-cyan-300/80 whitespace-pre-wrap break-all">{{ line.toolResult }}</pre>
        </div>
      </div>
    </Transition>
  </div>
</template>
