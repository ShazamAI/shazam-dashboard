<script setup lang="ts">
interface PendingTask {
  id: string;
  title: string;
  assignedTo: string;
}

interface Props {
  data: {
    tasks: PendingTask[];
  };
}

defineProps<Props>();
const emit = defineEmits<{
  approve: [id: string];
  reject: [id: string];
  approveAll: [];
}>();
</script>

<template>
  <div class="rounded-xl border border-yellow-500/30 bg-gray-900/90 px-4 py-3 shadow-lg w-[260px] max-h-[300px] overflow-hidden">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-medium text-yellow-400">🔔 Approval Queue</span>
      <button
        v-if="data.tasks.length > 0"
        class="text-[10px] text-green-400 hover:text-green-300"
        @click.stop="emit('approveAll')"
      >Approve All</button>
    </div>
    <div class="overflow-y-auto max-h-[240px] space-y-1.5 scrollbar-none">
      <div
        v-for="task in data.tasks"
        :key="task.id"
        class="rounded-lg bg-gray-800/60 px-3 py-2"
      >
        <div class="text-[11px] text-gray-200 truncate">{{ task.title }}</div>
        <div class="text-[9px] text-gray-500 mt-0.5">{{ task.assignedTo }}</div>
        <div class="flex gap-1 mt-1.5">
          <button
            class="flex-1 rounded bg-green-500/20 px-2 py-0.5 text-[10px] text-green-400 hover:bg-green-500/30"
            @click.stop="emit('approve', task.id)"
          >✓</button>
          <button
            class="flex-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/30"
            @click.stop="emit('reject', task.id)"
          >✗</button>
        </div>
      </div>
      <div v-if="data.tasks.length === 0" class="text-center text-[10px] text-gray-600 py-3">
        No tasks awaiting approval
      </div>
    </div>
  </div>
</template>
