import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchTasks } from '@/api/taskService';
import type { Task, TaskStatus, TaskFilter } from '@/types';

/**
 * Task Store — central state for task data, pagination, and filtering.
 *
 * Pages and composables consume this store for task state.
 * API calls remain in taskService.ts; this store orchestrates state.
 */
export const useTaskStore = defineStore('tasks', () => {
  // ─── State ──────────────────────────────────────────

  const tasks = ref<Task[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Pagination
  const currentPage = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const totalPages = ref(1);

  // Filters
  const statusFilter = ref<TaskStatus | ''>('');
  const agentFilter = ref('');
  const searchQuery = ref('');

  // ─── Getters ────────────────────────────────────────

  /** Client-side search on top of server-paginated results */
  const filteredTasks = computed(() => {
    if (!searchQuery.value) return tasks.value;
    const q = searchQuery.value.toLowerCase();
    return tasks.value.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
    );
  });

  const statusCounts = computed(() => {
    const counts: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
      awaiting_approval: 0,
      paused: 0,
    };
    for (const t of tasks.value) {
      if (t.status in counts) counts[t.status]++;
    }
    return counts;
  });

  const uniqueAgents = computed(() => {
    const agents = new Set<string>();
    for (const t of tasks.value) {
      if (t.assigned_to) agents.add(t.assigned_to);
    }
    return Array.from(agents).sort();
  });

  const paginationInfo = computed(() => ({
    start: total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1,
    end: Math.min(currentPage.value * pageSize.value, total.value),
    total: total.value,
  }));

  // ─── Actions ────────────────────────────────────────

  async function load(opts: { silent?: boolean; page?: number; company?: string } = {}): Promise<void> {
    const targetPage = opts.page ?? currentPage.value;
    if (!opts.silent) isLoading.value = true;

    try {
      const filters: TaskFilter = { page: targetPage, page_size: pageSize.value };
      if (opts.company) filters.company = opts.company;
      if (statusFilter.value) filters.status = statusFilter.value;
      if (agentFilter.value) filters.assigned_to = agentFilter.value;

      const result = await fetchTasks(filters);

      tasks.value = result.items;
      total.value = result.total;
      totalPages.value = result.total_pages;
      currentPage.value = result.page;
      error.value = null;

      // Clamp page
      if (currentPage.value > totalPages.value && totalPages.value > 0) {
        currentPage.value = totalPages.value;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tasks';
      if (!opts.silent) throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /** Update a single task in-place (from WS event or action result) */
  function updateTask(taskId: string, updated: Task): void {
    const idx = tasks.value.findIndex((t) => t.id === taskId);
    if (idx !== -1) tasks.value[idx] = updated;
  }

  /** Remove a task from the list (after deletion) */
  function removeTask(taskId: string): void {
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
  }

  /** Update task status from WS event without full reload */
  function patchTaskStatus(taskId: string, status: TaskStatus, timestamp: string): void {
    const idx = tasks.value.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      const existing = tasks.value[idx];
      if (existing) {
        tasks.value[idx] = { ...existing, status, updated_at: timestamp };
      }
    }
  }

  function resetFilters(): void {
    statusFilter.value = '';
    agentFilter.value = '';
    searchQuery.value = '';
    currentPage.value = 1;
  }

  return {
    // State
    tasks,
    isLoading,
    error,
    currentPage,
    pageSize,
    total,
    totalPages,
    statusFilter,
    agentFilter,
    searchQuery,

    // Getters
    filteredTasks,
    statusCounts,
    uniqueAgents,
    paginationInfo,

    // Actions
    load,
    updateTask,
    removeTask,
    patchTaskStatus,
    resetFilters,
  };
});
