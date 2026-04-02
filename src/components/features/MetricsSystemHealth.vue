<script setup lang="ts">
interface Props {
  isConnected: boolean;
  totalTasks: number;
  reconnectAttempts: number;
}

defineProps<Props>();
</script>

<template>
  <div class="rounded-xl border border-gray-800 bg-surface-card p-3 sm:p-4">
    <h3 class="mb-3 text-sm font-semibold text-white">System Health</h3>
    <div class="space-y-2 text-xs">
      <div class="flex justify-between">
        <span class="text-gray-500">Connection</span>
        <span class="flex items-center gap-1.5">
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="isConnected ? 'bg-emerald-500' : 'bg-red-500'"
          />
          <span :class="isConnected ? 'text-emerald-400' : 'text-red-400'">
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Total Tasks</span>
        <span class="font-mono font-medium text-gray-300">{{ totalTasks }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">WS Reconnects</span>
        <span class="font-mono font-medium text-gray-300">{{ reconnectAttempts }}</span>
      </div>
    </div>
  </div>
</template>
