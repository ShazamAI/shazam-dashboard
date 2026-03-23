import { ref } from 'vue';
import {
  createTask,
  approveTask,
  rejectTask,
  pauseTask,
  resumeTask,
  retryTask,
  deleteTask,
  approveAllTasks,
} from '@/api/taskService';
import type { Task, CreateTaskPayload } from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface TaskActionCallbacks {
  onTaskUpdated: (taskId: string, updated: Task) => void;
  onTaskRemoved: (taskId: string) => void;
  onReload: (opts?: { silent?: boolean; page?: number }) => Promise<void>;
  toast: { success: (msg: string) => void; error: (msg: string) => void };
}

// ─── Composable ─────────────────────────────────────────

export function useTaskActions(callbacks: TaskActionCallbacks) {
  const actionLoading = ref<Record<string, string>>({});
  const showCreateForm = ref(false);
  const isCreating = ref(false);
  const createForm = ref<CreateTaskPayload>({
    title: '',
    description: '',
    assigned_to: '',
    depends_on: '',
  });

  function isActionBusy(taskId: string, action: string): boolean {
    return actionLoading.value[taskId] === action;
  }

  function hasAnyActionBusy(taskId: string): boolean {
    return !!actionLoading.value[taskId];
  }

  async function executeAction(
    taskId: string,
    action: string,
    fn: (id: string) => Promise<unknown>
  ): Promise<void> {
    actionLoading.value = { ...actionLoading.value, [taskId]: action };
    try {
      const result = await fn(taskId);

      if (action === 'delete') {
        callbacks.onTaskRemoved(taskId);
        callbacks.toast.success('Task deleted');
      } else if (result && typeof result === 'object' && 'id' in result) {
        callbacks.onTaskUpdated(taskId, result as Task);
        callbacks.toast.success(`Task ${action}d`);
      } else {
        await callbacks.onReload();
        callbacks.toast.success(`Task ${action}d`);
      }
    } catch (err) {
      callbacks.toast.error(err instanceof Error ? err.message : `Failed to ${action} task`);
    } finally {
      const next = { ...actionLoading.value };
      delete next[taskId];
      actionLoading.value = next;
    }
  }

  async function handleApproveAll(): Promise<void> {
    try {
      const result = await approveAllTasks();
      await callbacks.onReload();
      callbacks.toast.success(`Approved ${result.approved ?? 'all'} tasks`);
    } catch (err) {
      callbacks.toast.error(err instanceof Error ? err.message : 'Failed to approve all');
    }
  }

  async function handleCreate(companyName: string): Promise<void> {
    if (!createForm.value.title.trim()) return;

    isCreating.value = true;
    try {
      const payload: CreateTaskPayload = {
        title: createForm.value.title.trim(),
      };
      if (createForm.value.description?.trim()) payload.description = createForm.value.description.trim();
      if (createForm.value.assigned_to) payload.assigned_to = createForm.value.assigned_to;
      if (createForm.value.depends_on?.trim()) payload.depends_on = createForm.value.depends_on.trim();

      await createTask(companyName, payload);
      resetCreateForm();
      callbacks.toast.success('Task created');
      await callbacks.onReload({ silent: true, page: 1 });
    } catch (err) {
      callbacks.toast.error(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      isCreating.value = false;
    }
  }

  function resetCreateForm(): void {
    createForm.value = { title: '', description: '', assigned_to: '', depends_on: '' };
    showCreateForm.value = false;
  }

  // Re-export action functions for direct use in templates
  const actions = {
    approve: approveTask,
    reject: rejectTask,
    pause: pauseTask,
    resume: resumeTask,
    retry: retryTask,
    delete: deleteTask,
  } as const;

  return {
    actionLoading,
    showCreateForm,
    isCreating,
    createForm,
    actions,
    isActionBusy,
    hasAnyActionBusy,
    executeAction,
    handleApproveAll,
    handleCreate,
    resetCreateForm,
  };
}
