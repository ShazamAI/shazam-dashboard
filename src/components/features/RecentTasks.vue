<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue';
import type { Task } from '@/types';

interface Props {
  tasks: Task[];
}

defineProps<Props>();

const emit = defineEmits<{
  viewAll: [];
  filterByStatus: [status: string];
  selectTask: [task: Task];
}>();

function formatAgent(task: Task): string {
  return task.assigned_to ?? 'Unassigned';
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'unknown';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'unknown';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function statusDotClass(status: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-400';
    case 'in_progress': return 'bg-blue-400';
    case 'completed': return 'bg-emerald-400';
    case 'failed': return 'bg-red-400';
    case 'awaiting_approval': return 'bg-purple-400';
    case 'paused': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
}
</script>

<template>
  <div class="recent-tasks card overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
      <h3 class="text-sm font-semibold text-white">Recent Tasks</h3>
      <button
        class="text-[11px] font-medium text-shazam-400 transition-colors duration-200 hover:text-shazam-300"
        @click="emit('viewAll')"
      >
        View All →
      </button>
    </div>

    <!-- Task list with mini timeline -->
    <div class="relative">
      <div
        v-for="(task, index) in tasks"
        :key="task.id"
        class="task-item group relative"
      >
        <button
          class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 hover:bg-gray-800/30"
          @click="emit('selectTask', task)"
        >
          <!-- Timeline dot + line -->
          <div class="relative flex shrink-0 flex-col items-center self-stretch">
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full ring-2 ring-surface-card transition-transform duration-200 group-hover:scale-125"
              :class="statusDotClass(task.status)"
            />
            <div
              v-if="index < tasks.length - 1"
              class="mt-1 w-px flex-1 bg-gray-800/60"
              style="min-height: 8px;"
            />
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium text-gray-300 transition-colors duration-200 group-hover:text-white" :title="task.title">
              {{ task.title }}
            </p>
            <div class="mt-0.5 flex items-center gap-2">
              <span
                class="text-[10px]"
                :class="task.assigned_to ? 'text-shazam-400/70' : 'text-gray-600'"
              >
                {{ formatAgent(task) }}
              </span>
              <span class="text-[10px] tabular-nums text-gray-600">
                {{ timeAgo(task.updated_at) }}
              </span>
            </div>
          </div>

          <!-- Status badge -->
          <StatusBadge :status="task.status" />
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="tasks.length === 0"
        class="flex flex-col items-center gap-1.5 px-4 py-8 text-center"
      >
        <svg class="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="text-xs text-gray-600">No tasks yet</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-tasks {
  animation: recentIn 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes recentIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-item {
  animation: taskRowIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.task-item:nth-child(1) { animation-delay: 50ms; }
.task-item:nth-child(2) { animation-delay: 80ms; }
.task-item:nth-child(3) { animation-delay: 110ms; }
.task-item:nth-child(4) { animation-delay: 140ms; }
.task-item:nth-child(5) { animation-delay: 170ms; }

@keyframes taskRowIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
