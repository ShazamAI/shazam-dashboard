<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

interface OutputLine {
  time: string;
  type: string; // tool_use, agent_output, task_created, task_completed, task_failed
  text: string;
}

interface Props {
  agentName: string;
  isExpanded: boolean;
  lines: OutputLine[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();
const scrollRef = ref<HTMLElement | null>(null);

const typeIcon: Record<string, string> = {
  tool_use: '🔧',
  agent_output: '💬',
  task_created: '📋',
  task_completed: '✅',
  task_failed: '❌',
  task_started: '🚀',
  task_approved: '✅',
  task_rejected: '🚫',
};

const typeColor: Record<string, string> = {
  tool_use: 'text-purple-400',
  agent_output: 'text-gray-300',
  task_created: 'text-blue-400',
  task_completed: 'text-green-400',
  task_failed: 'text-red-400',
  task_started: 'text-yellow-400',
};

// Auto-scroll to bottom when new lines arrive
watch(() => props.lines.length, async () => {
  await nextTick();
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
  }
});
</script>

<template>
  <Transition name="slide">
    <div
      v-if="isExpanded"
      class="rounded-xl border border-gray-700 bg-gray-950/95 shadow-2xl overflow-hidden backdrop-blur-sm"
      :style="{ width: '380px', maxHeight: '350px' }"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/80">
        <div class="flex items-center gap-2">
          <span class="text-sm">⚡</span>
          <span class="text-xs font-semibold text-white">{{ agentName }}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">live</span>
        </div>
        <button
          class="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
          @click="emit('close')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Output lines (terminal-like) -->
      <div
        ref="scrollRef"
        class="overflow-y-auto p-2 font-mono text-[11px] leading-relaxed space-y-0.5 scrollbar-none bg-gray-950"
        :style="{ maxHeight: '300px' }"
      >
        <div v-if="lines.length === 0" class="text-gray-600 text-center py-8">
          Waiting for output...
        </div>
        <div
          v-for="(line, i) in lines"
          :key="i"
          class="flex gap-1.5 py-0.5 px-1 rounded hover:bg-gray-900/50"
        >
          <span class="text-gray-600 shrink-0 w-12">{{ line.time }}</span>
          <span class="shrink-0">{{ typeIcon[line.type] || '•' }}</span>
          <span class="break-all" :class="typeColor[line.type] || 'text-gray-400'">{{ line.text }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active { transition: all 0.2s ease-out; }
.slide-leave-active { transition: all 0.15s ease-in; }
.slide-enter-from { opacity: 0; transform: translateY(-8px) scale(0.95); }
.slide-leave-to { opacity: 0; transform: translateY(-8px) scale(0.95); }
</style>
