<script setup lang="ts">
interface Props {
  data: {
    totalTasks: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cost: string;
  };
}

defineProps<Props>();
</script>

<template>
  <div class="rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-3 shadow-lg min-w-[200px]">
    <div class="text-xs font-medium text-gray-300 mb-2">📊 Project Stats</div>
    <div class="grid grid-cols-3 gap-2 text-center">
      <div>
        <div class="text-lg font-bold text-yellow-400">{{ data.pending }}</div>
        <div class="text-[9px] text-gray-500">PENDING</div>
      </div>
      <div>
        <div class="text-lg font-bold text-blue-400">{{ data.running }}</div>
        <div class="text-[9px] text-gray-500">RUNNING</div>
      </div>
      <div>
        <div class="text-lg font-bold text-green-400">{{ data.completed }}</div>
        <div class="text-[9px] text-gray-500">DONE</div>
      </div>
    </div>
    <div class="flex justify-between mt-2 text-[10px] text-gray-500">
      <span>Total: {{ data.totalTasks }}</span>
      <span v-if="data.failed > 0" class="text-red-400">{{ data.failed }} failed</span>
      <span>{{ data.cost }}</span>
    </div>
  </div>
</template>
