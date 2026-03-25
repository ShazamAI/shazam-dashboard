<script setup lang="ts">
interface Props {
  data: {
    branch: string;
    status: string;
    behindAhead?: string;
  };
}

defineProps<Props>();
</script>

<template>
  <div class="rounded-xl border border-gray-700 bg-gray-900/90 px-4 py-3 shadow-lg min-w-[180px]">
    <div class="flex items-center gap-2 mb-1.5">
      <span class="text-sm">🌿</span>
      <span class="text-xs font-medium text-gray-300">Git</span>
    </div>
    <div class="text-sm font-mono text-cyan-400">{{ data.branch || 'unknown' }}</div>
    <div class="text-[10px] mt-1" :class="data.status === 'clean' ? 'text-green-400' : 'text-yellow-400'">
      {{ data.status === 'clean' ? '✓ clean' : data.status }}
    </div>
  </div>
</template>
