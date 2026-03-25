<script setup lang="ts">
import { computed } from 'vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import AppButton from '@/components/common/Button.vue';
import type { Task } from '@/types';

interface Props {
  tasks: Task[];
  selectedTaskId: string | null;
  isPageLoading: boolean;
  currentPage: number;
  actionLoading: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [task: Task];
  navigateAgent: [name: string];
  action: [taskId: string, action: string];
}>();

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(dateStr);
}

function isBusy(taskId: string, action: string): boolean {
  return props.actionLoading[taskId] === action;
}
function hasAnyBusy(taskId: string): boolean {
  return !!props.actionLoading[taskId];
}

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

const hasActions = computed(() => (task: Task) => {
  return ['awaiting_approval', 'pending', 'in_progress', 'paused', 'failed'].includes(task.status);
});

const hasAnyPipeline = computed(() =>
  props.tasks.some(t => Array.isArray(t.pipeline) && t.pipeline.length > 1)
);

function stageLabel(task: Task): string | null {
  if (!task.pipeline || task.pipeline.length <= 1 || task.current_stage == null) return null;
  const stage = task.pipeline[task.current_stage];
  return stage ? `${task.current_stage + 1}/${task.pipeline.length} ${stage.name}` : null;
}

</script>

<template>
  <div>
    <!-- Page loading indicator -->
    <Transition name="v-fade">
      <div
        v-if="isPageLoading"
        class="mb-3 flex items-center justify-center gap-2 rounded-xl border border-shazam-500/20 bg-shazam-500/5 py-2.5 text-xs font-medium text-shazam-400"
      >
        <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading page {{ currentPage }}...
      </div>
    </Transition>

    <!-- Desktop table -->
    <div
      class="card hidden overflow-hidden transition-opacity duration-200 md:block"
      :class="isPageLoading ? 'opacity-50 pointer-events-none' : ''"
    >
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-800 bg-gray-900/50">
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">ID</th>
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Title</th>
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Status</th>
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Agent</th>
            <th class="hidden px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 lg:table-cell sm:px-4 md:px-5">Created By</th>
            <th v-if="hasAnyPipeline" class="hidden px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 xl:table-cell sm:px-4 md:px-5">Stage</th>
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Updated</th>
            <th class="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800/40">
          <tr
            v-for="task in tasks"
            :key="task.id"
            class="task-row group cursor-pointer border-l-2 transition-all duration-200"
            :class="[
              statusAccentClass(task.status),
              selectedTaskId === task.id
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
            <td v-if="hasAnyPipeline" class="hidden px-3 py-3 xl:table-cell sm:px-4 md:px-5">
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
              <span class="text-xs tabular-nums text-gray-500" :title="formatDate(task.updated_at)">
                {{ formatRelativeTime(task.updated_at) }}
              </span>
            </td>
            <td class="px-3 py-3 sm:px-4 md:px-5" @click.stop>
              <div class="flex items-center justify-end gap-1">
                <AppButton
                  v-if="task.status === 'awaiting_approval'"
                  variant="success"
                  size="xs"
                  :disabled="isBusy(task.id, 'approve')"
                  :loading="isBusy(task.id, 'approve')"
                  title="Approve"
                  @click="emit('action', task.id, 'approve')"
                >
                  Approve
                </AppButton>
                <AppButton
                  v-if="task.status === 'awaiting_approval'"
                  variant="danger"
                  size="xs"
                  :disabled="isBusy(task.id, 'reject')"
                  :loading="isBusy(task.id, 'reject')"
                  title="Reject"
                  @click="emit('action', task.id, 'reject')"
                >
                  Reject
                </AppButton>
                <AppButton
                  v-if="task.status === 'pending' || task.status === 'in_progress'"
                  variant="warning"
                  size="xs"
                  :disabled="isBusy(task.id, 'pause')"
                  :loading="isBusy(task.id, 'pause')"
                  title="Pause"
                  @click="emit('action', task.id, 'pause')"
                >
                  Pause
                </AppButton>
                <AppButton
                  v-if="task.status === 'paused'"
                  variant="primary"
                  size="xs"
                  :disabled="isBusy(task.id, 'resume')"
                  :loading="isBusy(task.id, 'resume')"
                  title="Resume"
                  @click="emit('action', task.id, 'resume')"
                >
                  Resume
                </AppButton>
                <AppButton
                  v-if="task.status === 'failed'"
                  variant="warning"
                  size="xs"
                  :disabled="isBusy(task.id, 'retry')"
                  :loading="isBusy(task.id, 'retry')"
                  title="Retry"
                  @click="emit('action', task.id, 'retry')"
                >
                  Retry
                </AppButton>
                <AppButton
                  variant="ghost"
                  size="xs"
                  :disabled="hasAnyBusy(task.id)"
                  :loading="isBusy(task.id, 'delete')"
                  title="Delete"
                  @click="emit('action', task.id, 'delete')"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </AppButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile card list -->
    <div class="space-y-2 md:hidden" :class="isPageLoading ? 'opacity-50 pointer-events-none' : ''">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-card group cursor-pointer overflow-hidden rounded-xl border border-l-2 bg-gradient-to-br from-surface-card to-gray-900 transition-all duration-200"
        :class="[
          statusAccentClass(task.status),
          selectedTaskId === task.id
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
          <div v-if="hasActions(task)" class="flex flex-wrap gap-1.5" @click.stop>
            <AppButton v-if="task.status === 'awaiting_approval'" variant="success" size="sm" :disabled="isBusy(task.id, 'approve')" :loading="isBusy(task.id, 'approve')" @click="emit('action', task.id, 'approve')">Approve</AppButton>
            <AppButton v-if="task.status === 'awaiting_approval'" variant="danger" size="sm" :disabled="isBusy(task.id, 'reject')" :loading="isBusy(task.id, 'reject')" @click="emit('action', task.id, 'reject')">Reject</AppButton>
            <AppButton v-if="task.status === 'pending' || task.status === 'in_progress'" variant="warning" size="sm" :disabled="isBusy(task.id, 'pause')" :loading="isBusy(task.id, 'pause')" @click="emit('action', task.id, 'pause')">Pause</AppButton>
            <AppButton v-if="task.status === 'paused'" variant="primary" size="sm" :disabled="isBusy(task.id, 'resume')" :loading="isBusy(task.id, 'resume')" @click="emit('action', task.id, 'resume')">Resume</AppButton>
            <AppButton v-if="task.status === 'failed'" variant="warning" size="sm" :disabled="isBusy(task.id, 'retry')" :loading="isBusy(task.id, 'retry')" @click="emit('action', task.id, 'retry')">Retry</AppButton>
          </div>
        </div>
      </div>
    </div>
  </div>
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
