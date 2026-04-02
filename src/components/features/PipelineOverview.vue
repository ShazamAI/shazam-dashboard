<script setup lang="ts">
import { computed } from 'vue';
import type { Task } from '@/types';

interface Props {
  tasks: Task[];
}

const props = defineProps<Props>();

const STAGE_COLORS: Record<string, string> = {
  'pending': 'bg-gray-500',
  'in progress': 'bg-shazam-500',
  'completed': 'bg-emerald-500',
  'failed': 'bg-red-500',
  'awaiting approval': 'bg-yellow-500',
  'paused': 'bg-purple-500',
};

const pipelineStages = computed(() => {
  const stages: Record<string, number> = {};
  for (const task of props.tasks) {
    if (task.pipeline && Array.isArray(task.pipeline)) {
      for (const stage of task.pipeline) {
        const name = stage.name ?? 'unknown';
        if (!stages[name]) stages[name] = 0;
        if (stage.status === 'in_progress') stages[name]++;
      }
    } else {
      const statusStage = task.status.replace('_', ' ');
      if (!stages[statusStage]) stages[statusStage] = 0;
      stages[statusStage]++;
    }
  }
  return stages;
});

const pipelineTotal = computed(() =>
  Object.values(pipelineStages.value).reduce((sum, n) => sum + n, 0),
);

function getStageColor(name: string): string {
  return STAGE_COLORS[name] ?? 'bg-blue-500';
}

function getStagePercent(count: number): number {
  if (pipelineTotal.value === 0) return 0;
  return (count / pipelineTotal.value) * 100;
}
</script>

<template>
  <div v-if="tasks.length > 0" class="rounded-2xl border border-gray-800 bg-surface-card p-4">
    <h3 class="mb-3 text-sm font-semibold text-white">Pipeline Overview</h3>

    <!-- Horizontal stacked bar -->
    <div class="mb-3 flex h-4 overflow-hidden rounded-full bg-gray-800">
      <template v-for="(count, stage) in pipelineStages" :key="stage">
        <div
          v-if="count > 0"
          class="transition-all duration-500 ease-out"
          :class="getStageColor(String(stage))"
          :style="{ width: `${getStagePercent(count)}%`, minWidth: count > 0 ? '4px' : '0' }"
          :title="`${stage}: ${count}`"
        />
      </template>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-x-4 gap-y-1.5">
      <template v-for="(count, stage) in pipelineStages" :key="stage">
        <div v-if="count > 0" class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full" :class="getStageColor(String(stage))" />
          <span class="text-[11px] text-gray-400 capitalize">{{ stage }}</span>
          <span class="text-[11px] font-medium text-gray-300">{{ count }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
