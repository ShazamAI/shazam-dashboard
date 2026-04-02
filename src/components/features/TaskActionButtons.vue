<script setup lang="ts">
import AppButton from '@/components/common/Button.vue';
import type { Task } from '@/types';

interface Props {
  task: Task;
  actionLoading: Record<string, string>;
  size?: 'xs' | 'sm';
  showDelete?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  showDelete: false,
});

const emit = defineEmits<{
  action: [taskId: string, action: string];
}>();

function isBusy(action: string): boolean {
  return props.actionLoading[props.task.id] === action;
}

function hasAnyBusy(): boolean {
  return !!props.actionLoading[props.task.id];
}
</script>

<template>
  <AppButton
    v-if="task.status === 'awaiting_approval'"
    variant="success"
    :size="size"
    :disabled="isBusy('approve')"
    :loading="isBusy('approve')"
    title="Approve"
    @click="emit('action', task.id, 'approve')"
  >
    Approve
  </AppButton>
  <AppButton
    v-if="task.status === 'awaiting_approval'"
    variant="danger"
    :size="size"
    :disabled="isBusy('reject')"
    :loading="isBusy('reject')"
    title="Reject"
    @click="emit('action', task.id, 'reject')"
  >
    Reject
  </AppButton>
  <AppButton
    v-if="task.status === 'pending' || task.status === 'in_progress'"
    variant="warning"
    :size="size"
    :disabled="isBusy('pause')"
    :loading="isBusy('pause')"
    title="Pause"
    @click="emit('action', task.id, 'pause')"
  >
    Pause
  </AppButton>
  <AppButton
    v-if="task.status === 'paused'"
    variant="primary"
    :size="size"
    :disabled="isBusy('resume')"
    :loading="isBusy('resume')"
    title="Resume"
    @click="emit('action', task.id, 'resume')"
  >
    Resume
  </AppButton>
  <AppButton
    v-if="task.status === 'failed'"
    variant="warning"
    :size="size"
    :disabled="isBusy('retry')"
    :loading="isBusy('retry')"
    title="Retry"
    @click="emit('action', task.id, 'retry')"
  >
    Retry
  </AppButton>
  <AppButton
    v-if="showDelete"
    variant="ghost"
    :size="size"
    :disabled="hasAnyBusy()"
    :loading="isBusy('delete')"
    title="Delete"
    aria-label="Delete task"
    @click="emit('action', task.id, 'delete')"
  >
    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </AppButton>
</template>
