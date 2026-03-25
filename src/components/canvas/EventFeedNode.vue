<script setup lang="ts">
interface EventItem {
  time: string;
  agent: string;
  text: string;
  type: string;
}

interface Props {
  data: {
    events: EventItem[];
  };
}

defineProps<Props>();

const typeColor: Record<string, string> = {
  task_created: 'text-blue-400',
  task_started: 'text-yellow-400',
  task_completed: 'text-green-400',
  task_failed: 'text-red-400',
  task_approved: 'text-green-400',
  tool_use: 'text-purple-400',
  agent_output: 'text-cyan-400',
};
</script>

<template>
  <div class="rounded-xl border border-gray-700 bg-gray-900/90 shadow-lg w-[280px] max-h-[300px] overflow-hidden">
    <div class="px-3 py-2 border-b border-gray-800 text-xs font-medium text-gray-300 flex items-center gap-1.5">
      <span>⚡</span> Live Events
      <span class="ml-auto text-[10px] text-gray-600">{{ data.events.length }}</span>
    </div>
    <div class="overflow-y-auto max-h-[260px] scrollbar-none">
      <div
        v-for="(event, i) in data.events"
        :key="i"
        class="px-3 py-1.5 border-b border-gray-800/50 last:border-0"
      >
        <div class="flex items-center gap-1.5">
          <span class="text-[9px] text-gray-600 font-mono w-10 shrink-0">{{ event.time }}</span>
          <span class="text-[10px] font-medium text-gray-400">{{ event.agent }}</span>
        </div>
        <div class="text-[10px] truncate mt-0.5" :class="typeColor[event.type] || 'text-gray-500'">
          {{ event.text }}
        </div>
      </div>
      <div v-if="data.events.length === 0" class="px-3 py-4 text-center text-[10px] text-gray-600">
        Waiting for events...
      </div>
    </div>
  </div>
</template>
