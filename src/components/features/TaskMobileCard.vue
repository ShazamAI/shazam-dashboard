<script setup lang="ts">
import { computed } from 'vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TaskActionButtons from '@/components/features/TaskActionButtons.vue';
import { formatRelativeTime } from '@/utils/formatters';
import type { Task } from '@/types';

interface Props {
  task: Task;
  selected: boolean;
  actionLoading: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [task: Task];
  navigateAgent: [name: string];
  action: [taskId: string, action: string];
}>();

const ACTIONABLE_STATUSES = new Set(['awaiting_approval', 'pending', 'in_progress', 'paused', 'failed']);

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

const hasActions = computed(() => ACTIONABLE_STATUSES.has(props.task.status));
</script>

<template>
  <div
    class="task-card group cursor-pointer overflow-hidden rounded-xl border border-l-2 bg-gradient-to-br from-surface-card to-gray-900 transition-all duration-200"
    :class="[
      statusAccentClass(task.status),
      selected
        ? 'border-shazam-500/40 shadow-sm shadow-shazam-500/10 border-l-shazam-500/60'
        : 'border-gray-800/60 hover:border-gray-700',
    ]"
    @click="emit('select', task)"
  >
    <div class="p-3.5">
      <!-- Title + Status -->
      <div class="mb-2.5 flex items-start justify-between gap-2">
        <p class="text-sm font-medium text-gray-200 group-hover:text-white">{{ task.title }}</p>
        <StatusBadge :status="task.status" />
      </div>

      <!-- Meta row -->
      <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="font-mono text-[10px] text-gray-600">{{ task.id.length > 12 ? task.id.slice(0, 12) + '…' : task.id }}</span>
        <button
          v-if="task.assigned_to"
          class="entity-link text-xs"
          @click.stop="emit('navigateAgent', task.assigned_to)"
        >
          {{ task.assigned_to }}
        </button>
        <span class="text-[10px] tabular-nums text-gray-600">{{ formatRelativeTime(task.updated_at) }}</span>
      </div>

      <!-- Actions -->
      <div v-if="hasActions" class="flex flex-wrap gap-1.5" @click.stop>
        <TaskActionButtons
          :task="task"
          :action-loading="actionLoading"
          size="sm"
          @action="(taskId: string, action: string) => emit('action', taskId, action)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  animation: cardSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
