<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import AppButton from '@/components/common/Button.vue';
import PipelineSteps from '@/components/features/PipelineSteps.vue';
import { updateTask } from '@/api/taskService';
import type { Task } from '@/types';

interface Props {
  task: Task;
  actionLoading: Record<string, string>;
}

const props = defineProps<Props>();

const hasPipeline = computed(() =>
  Array.isArray(props.task.pipeline) && props.task.pipeline.length > 1
);

const emit = defineEmits<{
  close: [];
  navigateAgent: [name: string];
  action: [taskId: string, action: string];
  updated: [task: Task];
}>();

// ─── Edit Mode ──────────────────────────────
const isEditing = ref(false);
const editTitle = ref('');
const editDescription = ref('');
const editSaving = ref(false);

watch(() => props.task, (t) => {
  editTitle.value = t.title;
  editDescription.value = t.description ?? '';
  isEditing.value = false;
}, { immediate: true });

function startEditing() {
  editTitle.value = props.task.title;
  editDescription.value = props.task.description ?? '';
  isEditing.value = true;
}

function cancelEditing() {
  isEditing.value = false;
}

async function saveEdits() {
  editSaving.value = true;
  try {
    const updated = await updateTask(props.task.id, {
      title: editTitle.value,
      description: editDescription.value,
    });
    emit('updated', updated);
    isEditing.value = false;
  } catch (e) {
    console.error('Failed to update task:', e);
  } finally {
    editSaving.value = false;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatResult(result: unknown): string {
  if (result === null || result === undefined) return '';
  if (typeof result === 'string') return result;
  return JSON.stringify(result, null, 2);
}

function isBusy(taskId: string, action: string): boolean {
  return props.actionLoading[taskId] === action;
}
function hasAnyBusy(taskId: string): boolean {
  return !!props.actionLoading[taskId];
}

</script>

<template>
  <div class="detail-panel card w-full shrink-0 overflow-hidden lg:w-[420px]">
    <!-- Header -->
    <div class="flex items-start justify-between border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
      <div class="min-w-0 flex-1">
        <div class="mb-1.5 flex items-center gap-2">
          <StatusBadge :status="task.status" />
          <span class="font-mono text-[10px] text-gray-600">{{ task.id }}</span>
        </div>
        <input
          v-if="isEditing"
          v-model="editTitle"
          class="section-title w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 leading-snug text-white focus:border-shazam-500 focus:outline-none"
        />
        <h2 v-else class="section-title leading-snug">{{ task.title }}</h2>
      </div>
      <button
        class="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
        aria-label="Close detail panel"
        @click="emit('close')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Pipeline Steps -->
    <div v-if="hasPipeline" class="border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
      <PipelineSteps
        :stages="task.pipeline!"
        :current-stage="task.current_stage ?? 0"
        :workflow-name="task.workflow"
      />
    </div>

    <!-- Body -->
    <div class="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
      <!-- Metadata grid -->
      <div class="grid grid-cols-2 gap-3 border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
        <div>
          <p class="data-label text-[10px] sm:text-xs">Assigned To</p>
          <p class="mt-1 text-xs text-gray-300">
            <button v-if="task.assigned_to" class="entity-link" @click="emit('navigateAgent', task.assigned_to)">{{ task.assigned_to }}</button>
            <span v-else class="text-gray-600">Unassigned</span>
          </p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Created By</p>
          <p class="mt-1 text-xs text-gray-300">{{ task.created_by ?? '—' }}</p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Company</p>
          <p class="mt-1 text-xs text-gray-300">{{ task.company ?? '—' }}</p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Parent Task</p>
          <p class="mt-1 font-mono text-xs text-gray-300">{{ task.parent_task_id ?? '—' }}</p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Depends On</p>
          <p class="mt-1 font-mono text-xs text-gray-300">{{ task.depends_on ?? '—' }}</p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Created</p>
          <p class="mt-1 text-xs tabular-nums text-gray-300">{{ formatDate(task.created_at) }}</p>
        </div>
      </div>

      <!-- Description -->
      <div v-if="task.description || isEditing" class="border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
        <p class="micro-label mb-2">Description</p>
        <textarea
          v-if="isEditing"
          v-model="editDescription"
          rows="4"
          class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs leading-relaxed text-gray-300 focus:border-shazam-500 focus:outline-none"
        />
        <p v-else class="whitespace-pre-wrap text-xs leading-relaxed text-gray-300">{{ task.description }}</p>
      </div>

      <!-- Result -->
      <div v-if="task.result !== null && task.result !== undefined" class="border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
        <p class="micro-label mb-2">Result</p>
        <div class="max-h-80 overflow-y-auto rounded-lg border border-gray-800/50 bg-gray-950 p-3 scrollbar-thin">
          <pre class="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-300">{{ formatResult(task.result) }}</pre>
        </div>
      </div>
    </div>

    <!-- Actions footer -->
    <div class="border-t border-gray-800 px-3 py-2.5 sm:px-5 sm:py-3">
      <div class="flex flex-wrap gap-2">
        <AppButton v-if="task.status === 'awaiting_approval'" variant="success" size="sm" :disabled="isBusy(task.id, 'approve')" :loading="isBusy(task.id, 'approve')" @click="emit('action', task.id, 'approve')">
          Approve
        </AppButton>
        <AppButton v-if="task.status === 'awaiting_approval'" variant="danger" size="sm" :disabled="isBusy(task.id, 'reject')" :loading="isBusy(task.id, 'reject')" @click="emit('action', task.id, 'reject')">
          Reject
        </AppButton>
        <AppButton v-if="task.status === 'pending' || task.status === 'in_progress'" variant="warning" size="sm" :disabled="isBusy(task.id, 'pause')" :loading="isBusy(task.id, 'pause')" @click="emit('action', task.id, 'pause')">
          Pause
        </AppButton>
        <AppButton v-if="task.status === 'paused'" variant="primary" size="sm" :disabled="isBusy(task.id, 'resume')" :loading="isBusy(task.id, 'resume')" @click="emit('action', task.id, 'resume')">
          Resume
        </AppButton>
        <AppButton v-if="task.status === 'failed'" variant="warning" size="sm" :disabled="isBusy(task.id, 'retry')" :loading="isBusy(task.id, 'retry')" @click="emit('action', task.id, 'retry')">
          Retry
        </AppButton>
        <!-- Edit / Save / Cancel -->
        <template v-if="isEditing">
          <AppButton variant="primary" size="sm" :loading="editSaving" :disabled="editSaving" @click="saveEdits">
            Save
          </AppButton>
          <AppButton variant="ghost" size="sm" :disabled="editSaving" @click="cancelEditing">
            Cancel
          </AppButton>
        </template>
        <AppButton v-else variant="ghost" size="sm" @click="startEditing">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit
        </AppButton>
        <div class="flex-1" />
        <AppButton variant="ghost" size="sm" :disabled="hasAnyBusy(task.id)" :loading="isBusy(task.id, 'delete')" @click="emit('action', task.id, 'delete')">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-panel {
  animation: panelSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes panelSlideIn {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
