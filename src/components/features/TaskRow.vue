<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue';
import TaskActionButtons from '@/components/features/TaskActionButtons.vue';
import { formatRelativeDate, formatRelativeTime } from '@/utils/formatters';
import type { Task } from '@/types';

interface Props {
  task: Task;
  selected: boolean;
  actionLoading: Record<string, string>;
  showPipelineColumn: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  select: [task: Task];
  navigateAgent: [name: string];
  action: [taskId: string, action: string];
}>();

function statusAccentClass(status: string): string {
  switch (status) {
    case 'in_progress': return 'border-l-blue-500/50';
    case 'completed': return 'border-l-emerald-500/50';
    case 'failed': return 'border-l-red-500/50';
    case 'awaiting_approval': return 'border-l-purple-500/50';
    case 'pending': return 'border-l-yellow-500/50';
    case 'paused': return 'border-l-gray-500/50';
    default: return 'border-l-transparent';
  }
}

function stageLabel(task: Task): string | null {
  if (!task.pipeline || task.pipeline.length <= 1 || task.current_stage == null) return null;
  const stage = task.pipeline[task.current_stage];
  return stage ? `${task.current_stage + 1}/${task.pipeline.length} ${stage.name}` : null;
}
</script>

<template>
  <tr
    class="task-row group cursor-pointer border-l-2 transition-all duration-200"
    :class="[
      statusAccentClass(task.status),
      selected
        ? 'bg-shazam-500/[0.06] border-l-shazam-500/60'
        : 'hover:bg-gray-800/30',
    ]"
    @click="emit('select', task)"
  >
    <td class="px-3 py-3 sm:px-4 md:px-5">
      <span class="font-mono text-[11px] text-gray-600 transition-colors group-hover:text-gray-400">
        {{ task.id.length > 8 ? task.id.slice(0, 8) + '…' : task.id }}
      </span>
    </td>
    <td class="max-w-[240px] px-3 py-3 sm:px-4 md:px-5">
      <span class="block truncate text-sm font-medium text-gray-200 transition-colors group-hover:text-white">
        {{ task.title }}
      </span>
    </td>
    <td class="px-3 py-3 sm:px-4 md:px-5">
      <StatusBadge :status="task.status" />
    </td>
    <td class="px-3 py-3 sm:px-4 md:px-5">
      <button
        v-if="task.assigned_to"
        class="entity-link text-xs"
        @click.stop="emit('navigateAgent', task.assigned_to)"
      >
        {{ task.assigned_to }}
      </button>
      <span v-else class="text-xs text-gray-700">—</span>
    </td>
    <td class="hidden px-3 py-3 lg:table-cell sm:px-4 md:px-5">
      <span class="text-xs text-gray-500">{{ task.created_by ?? '—' }}</span>
    </td>
    <td v-if="showPipelineColumn" class="hidden px-3 py-3 xl:table-cell sm:px-4 md:px-5">
      <div v-if="task.pipeline && task.pipeline.length > 1 && stageLabel(task)" class="flex items-center gap-1.5">
        <div class="flex gap-px">
          <div
            v-for="(s, si) in (task.pipeline ?? [])"
            :key="si"
            class="h-1.5 w-3 rounded-sm"
            :class="{
              'bg-emerald-500': s.status === 'completed',
              'bg-blue-500 animate-pulse': s.status === 'in_progress',
              'bg-red-500': s.status === 'rejected',
              'bg-gray-700': s.status === 'pending',
            }"
          />
        </div>
        <span class="text-[10px] text-gray-500">{{ stageLabel(task) }}</span>
      </div>
      <span v-else class="text-[10px] text-gray-700">—</span>
    </td>
    <td class="px-3 py-3 sm:px-4 md:px-5">
      <span class="text-xs tabular-nums text-gray-500" :title="formatRelativeDate(task.updated_at)">
        {{ formatRelativeTime(task.updated_at) }}
      </span>
    </td>
    <td class="px-3 py-3 sm:px-4 md:px-5" @click.stop>
      <div class="flex items-center justify-end gap-1">
        <TaskActionButtons
          :task="task"
          :action-loading="actionLoading"
          size="xs"
          show-delete
          @action="(taskId: string, action: string) => emit('action', taskId, action)"
        />
      </div>
    </td>
  </tr>
</template>

<style scoped>
.task-row {
  animation: rowFadeIn 0.3s ease-out both;
}

@keyframes rowFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
