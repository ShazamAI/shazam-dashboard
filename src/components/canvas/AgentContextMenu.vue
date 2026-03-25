<script setup lang="ts">
interface Props {
  agentName: string;
  x: number;
  y: number;
}

defineProps<Props>();
const emit = defineEmits<{
  close: [];
  viewOutput: [name: string];
  pauseAgent: [name: string];
  removeAgent: [name: string];
  viewConfig: [name: string];
}>();
</script>

<template>
  <div
    class="fixed z-50 rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl backdrop-blur-sm py-1 min-w-[180px]"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <button class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800" @click="emit('viewOutput', agentName); emit('close')">
      <span>⚡</span> View Output
    </button>
    <button class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800" @click="emit('viewConfig', agentName); emit('close')">
      <span>📝</span> View Changes
    </button>
    <div class="border-t border-gray-800 my-1" />
    <button class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-yellow-400 hover:bg-gray-800" @click="emit('pauseAgent', agentName); emit('close')">
      <span>⏸️</span> Pause Agent
    </button>
    <button class="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-gray-800" @click="emit('removeAgent', agentName); emit('close')">
      <span>🗑️</span> Remove Agent
    </button>
  </div>
</template>
