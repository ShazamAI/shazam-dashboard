import { ref, computed, watch, onUnmounted } from 'vue';
import { fetchTasks } from '@/api/taskService';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { normalizeError } from '@/api/utils';
import type { Task, TaskStatus, TaskFilter } from '@/types';

// ─── Constants ──────────────────────────────────────────

import { DEBOUNCE } from '@/constants/timing';

const REFRESH_DEBOUNCE_MS = DEBOUNCE.TASK_REFRESH;
const LOAD_TIMEOUT_MS = 8_000;

export const STATUS_META: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'text-yellow-400' },
  { value: 'in_progress', label: 'Running', color: 'text-blue-400' },
  { value: 'completed', label: 'Completed', color: 'text-emerald-400' },
  { value: 'failed', label: 'Failed', color: 'text-red-400' },
  { value: 'awaiting_approval', label: 'Awaiting', color: 'text-purple-400' },
  { value: 'paused', label: 'Paused', color: 'text-gray-400' },
];

/** Map backend event types → TaskStatus for in-place updates */
const EVENT_TO_STATUS: Record<string, TaskStatus> = {
  task_completed: 'completed',
  task_started: 'in_progress',
  task_failed: 'failed',
};

const TASK_EVENT_TYPES = new Set([
  'task_status_change', 'task_completed', 'task_started', 'task_failed', 'task_created',
]);

// ─── Composable ─────────────────────────────────────────

export function useTaskPagination() {
  // State
  const isLoading = ref(true);
  const isRefreshing = ref(false);
  const isPageLoading = ref(false);
  const error = ref<string | null>(null);
  const tasks = ref<Task[]>([]);

  // Filters
  const statusFilter = ref<TaskStatus | ''>('');
  const agentFilter = ref('');
  const searchQuery = ref('');

  // Pagination
  const currentPage = ref(1);
  const pageSize = ref(20);
  const serverTotal = ref(0);
  const serverTotalPages = ref(1);

  // Selection
  const selectedTask = ref<Task | null>(null);

  let refreshDebounce: ReturnType<typeof setTimeout> | null = null;
  let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
  let skipPageWatch = false;

  // ─── Derived ────────────────────────────────────────

  const displayTasks = computed(() => {
    let result = tasks.value;
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  });

  const totalPages = computed(() => serverTotalPages.value);

  const paginationInfo = computed(() => {
    const total = serverTotal.value;
    const start = total === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1;
    const end = Math.min(currentPage.value * pageSize.value, total);
    return { start, end, total };
  });

  const statusCounts = computed<Record<TaskStatus, number>>(() => {
    const counts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      awaiting_approval: 0,
      paused: 0,
    };
    for (const t of tasks.value) {
      if (t.status in counts) counts[t.status as TaskStatus]++;
    }
    return counts;
  });

  const uniqueAgents = computed(() => {
    const agents = new Set<string>();
    tasks.value.forEach((t) => {
      if (t.assigned_to) agents.add(t.assigned_to);
    });
    return Array.from(agents).sort();
  });

  // ─── Data loading ───────────────────────────────────

  async function loadTasks(opts: { silent?: boolean; page?: number } = {}): Promise<void> {
    const isSilent = opts.silent ?? false;
    const targetPage = opts.page ?? currentPage.value;

    if (isSilent) {
      isRefreshing.value = true;
    } else {
      isPageLoading.value = true;
    }

    try {
      const { activeCompany } = useActiveCompany();
      const filters: TaskFilter = {
        page: targetPage,
        page_size: pageSize.value,
      };
      if (activeCompany.value?.name) filters.company = activeCompany.value.name;
      if (statusFilter.value) filters.status = statusFilter.value;
      if (agentFilter.value) filters.assigned_to = agentFilter.value;

      const result = await fetchTasks(filters);

      tasks.value = result.items;
      serverTotal.value = result.total;
      serverTotalPages.value = result.total_pages;
      error.value = null;

      skipPageWatch = true;
      currentPage.value = result.page;
      if (currentPage.value > serverTotalPages.value && serverTotalPages.value > 0) {
        currentPage.value = serverTotalPages.value;
      }
      skipPageWatch = false;
    } catch (err) {
      const msg = normalizeError(err, 'Failed to load tasks');
      error.value = msg;
      if (!isSilent) throw err;
    } finally {
      isLoading.value = false;
      isRefreshing.value = false;
      isPageLoading.value = false;
    }
  }

  function scheduleRefresh(): void {
    if (refreshDebounce) clearTimeout(refreshDebounce);
    refreshDebounce = setTimeout(() => {
      loadTasks({ silent: true });
    }, REFRESH_DEBOUNCE_MS);
  }

  // ─── WS event handler ──────────────────────────────

  function handleTaskWsEvent(event: { type: string; task_id: string | null; data: unknown; timestamp: string }): void {
    if (!TASK_EVENT_TYPES.has(event.type)) return;

    const data = event.data as { task_id?: string; status?: TaskStatus; task?: Task; from?: string; to?: string } | undefined;
    const taskId = data?.task_id ?? event.task_id;

    if (!taskId) {
      // New task created but no ID — full reload handled by taskRefreshTick watcher
      return;
    }

    const idx = tasks.value.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      // Optimistic in-place update for tasks already visible
      if (data?.task) {
        tasks.value[idx] = data.task;
      } else {
        const newStatus = data?.to as TaskStatus | undefined ?? data?.status ?? EVENT_TO_STATUS[event.type];
        if (newStatus) {
          const existing = tasks.value[idx];
          tasks.value[idx] = { ...existing, status: newStatus, updated_at: event.timestamp } as Task;
        }
      }
      const updated = tasks.value[idx];
      if (updated && selectedTask.value?.id === taskId) {
        selectedTask.value = updated;
      }
    }
    // If task not in current page, the taskRefreshTick watcher will handle the reload
  }

  // ─── Task mutation helpers ──────────────────────────

  function updateTaskInList(taskId: string, updated: Task): void {
    const idx = tasks.value.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      tasks.value[idx] = updated;
      if (selectedTask.value?.id === taskId) selectedTask.value = updated;
    }
  }

  function removeTaskFromList(taskId: string): void {
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
    if (selectedTask.value?.id === taskId) selectedTask.value = null;
  }

  function selectTask(task: Task): void {
    selectedTask.value = selectedTask.value?.id === task.id ? null : task;
  }

  // ─── Watchers ───────────────────────────────────────

  watch([statusFilter, agentFilter, pageSize], () => {
    selectedTask.value = null;
    skipPageWatch = true;
    currentPage.value = 1;
    loadTasks({ page: 1 }).finally(() => { skipPageWatch = false; });
  });

  watch(currentPage, (newPage) => {
    if (skipPageWatch) return;
    loadTasks({ silent: true, page: newPage });
  });

  watch(searchQuery, () => {
    selectedTask.value = null;
  });

  // ─── Init helpers ───────────────────────────────────

  function startLoadingTimeout(onTimeout: () => void): void {
    loadingTimeout = setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false;
        onTimeout();
      }
    }, LOAD_TIMEOUT_MS);
  }

  function clearLoadingTimeout(): void {
    if (loadingTimeout) clearTimeout(loadingTimeout);
  }

  // ─── Cleanup ────────────────────────────────────────

  onUnmounted(() => {
    if (refreshDebounce) clearTimeout(refreshDebounce);
    if (loadingTimeout) clearTimeout(loadingTimeout);
  });

  return {
    // State
    isLoading,
    isRefreshing,
    isPageLoading,
    error,
    tasks,

    // Filters
    statusFilter,
    agentFilter,
    searchQuery,

    // Pagination
    currentPage,
    pageSize,
    serverTotal,
    totalPages,

    // Selection
    selectedTask,

    // Derived
    displayTasks,
    paginationInfo,
    statusCounts,
    uniqueAgents,

    // Actions
    loadTasks,
    scheduleRefresh,
    handleTaskWsEvent,
    updateTaskInList,
    removeTaskFromList,
    selectTask,
    startLoadingTimeout,
    clearLoadingTimeout,
  };
}
