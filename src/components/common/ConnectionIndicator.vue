<script setup lang="ts">
import { useWebSocket } from '@/composables/useWebSocket';

const ws = useWebSocket();
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span
      class="h-2 w-2 rounded-full"
      :class="ws.isConnected.value
        ? 'bg-emerald-500'
        : 'bg-red-500 animate-pulse'"
    />
    <span
      class="text-xs"
      :class="ws.isConnected.value ? 'text-emerald-400' : 'text-red-400'"
    >
      {{ ws.isConnected.value ? 'Connected' : 'Reconnecting...' }}
    </span>
  </div>
</template>
