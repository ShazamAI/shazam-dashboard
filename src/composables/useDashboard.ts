import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { fetchTasks, createTask } from '@/api/taskService';
import { fetchRecentEvents } from '@/api/eventService';
import { fetchAgents } from '@/api/companyService';
import { computeTotalCost } from '@/api/metricsService';
import { useWebSocket } from '@/composables/useWebSocket';
import { useEventFeed } from '@/composables/useEventFeed';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useToast } from '@/composables/useToast';
import { LOAD_TIMEOUT_MS, POLL_INTERVAL_MS } from '@/composables/useAsyncState';
import { taskRefreshTick, agentRefreshTick } from '@/composables/useRealtimeSync';
import { ensureArray, normalizeError } from '@/api/utils';
import { post } from '@/api/http';
import { registerSpotlightAction } from '@/composables/useSpotlight';
import type { Task, AgentWorker, ShazamEvent, PaginatedResult, CreateTaskPayload } from '@/types';

/** Extract Task[] from fetchTasks result (PaginatedResult or raw array) */
function extractTasks(result: PaginatedResult<Task> | unknown): Task[] {
  if (result && typeof result === 'object' && 'items' in (result as Record<string, unknown>)) {
    return ensureArray<Task>((result as PaginatedResult<Task>).items);
  }
  return ensureArray<Task>(result);
}

/**
 * Core dashboard state & logic.
 *
 * Encapsulates: data loading, task polling, WS event routing,
 * circuit-breaker handling, and company actions.
 */
export function useDashboard() {
  const toast = useToast();
  const { activeCompany, loadCompanies } = useActiveCompany();
  const ws = useWebSocket();
  const feed = useEventFeed();

  // ─── State ────────────────────────────────────────────
  const isLoading = ref(true);
  const hasError = ref(false);
  const tasks = ref<Task[]>([]);
  const agents = ref<AgentWorker[]>([]);
  const isPaused = ref(false);

  // ─── Create Task ───────────────────────────────────────
  const showCreateTask = ref(false);
  const isCreatingTask = ref(false);
  const createTaskForm = ref<CreateTaskPayload>({
    title: '',
    description: '',
    assigned_to: '',
    workflow: '',
  });
  const complexityWarning = ref<{ reasons: string[]; estimated: number } | null>(null);

  function openCreateTask() {
    createTaskForm.value = {
      title: '',
      description: '',
      assigned_to: '',
      workflow: '',
    };
    complexityWarning.value = null;
    showCreateTask.value = true;
  }

  function closeCreateTask() {
    showCreateTask.value = false;
    complexityWarning.value = null;
  }

  async function analyzeTaskComplexity(): Promise<boolean> {
    if (!createTaskForm.value.title.trim()) return false;
    try {
      const result = await post<{ should_decompose: boolean; reasons?: string[]; estimated_subtasks?: number }>('/tasks/analyze', createTaskForm.value);
      if (result.should_decompose) {
        complexityWarning.value = {
          reasons: result.reasons || [],
          estimated: result.estimated_subtasks || 3,
        };
        return true;
      } else {
        complexityWarning.value = null;
        return false;
      }
    } catch {
      complexityWarning.value = null;
      return false;
    }
  }

  async function handleCreateTask() {
    const companyName = activeCompany.value?.name;
    if (!createTaskForm.value.title.trim() || !companyName) return;

    // If no warning is shown yet, analyze complexity first
    if (!complexityWarning.value) {
      isCreatingTask.value = true;
      try {
        const shouldDecompose = await analyzeTaskComplexity();
        if (shouldDecompose) {
          // Show warning, don't create yet
          return;
        }
      } finally {
        isCreatingTask.value = false;
      }
    }

    // Create normally (user chose "Create Anyway" or task is simple)
    await forceCreateTask();
  }

  async function forceCreateTask() {
    const companyName = activeCompany.value?.name;
    if (!createTaskForm.value.title.trim() || !companyName) return;
    isCreatingTask.value = true;
    try {
      await createTask(companyName, createTaskForm.value);
      closeCreateTask();
      await refreshTasks();
      toast.success('Task created');
    } catch (err) {
      toast.error(normalizeError(err, 'Failed to create task'));
    } finally {
      isCreatingTask.value = false;
    }
  }

  async function createWithDecomposition() {
    const companyName = activeCompany.value?.name;
    if (!createTaskForm.value.title.trim() || !companyName) return;

    // Find a PM agent to assign to, or leave unassigned for the PM to pick up
    const pmAgent = agents.value.find(
      (a) => a.role?.toLowerCase().includes('manager') || a.role?.toLowerCase().includes('pm'),
    );

    isCreatingTask.value = true;
    try {
      const payload: CreateTaskPayload = {
        ...createTaskForm.value,
        assigned_to: pmAgent?.name || createTaskForm.value.assigned_to || '',
      };
      await createTask(companyName, payload);
      closeCreateTask();
      await refreshTasks();
      toast.success('Task sent to PM for decomposition');
    } catch (err) {
      toast.error(normalizeError(err, 'Failed to create task'));
    } finally {
      isCreatingTask.value = false;
    }
  }

  // ─── Derived ──────────────────────────────────────────
  const totalTokens = computed(() =>
    agents.value.reduce((sum, a) => sum + a.tokens_used, 0),
  );

  const totalCost = computed(() => computeTotalCost(totalTokens.value, agents.value));

  const taskStats = computed(() => {
    let pending = 0, running = 0, done = 0, failed = 0, awaiting = 0;
    for (const t of tasks.value) {
      switch (t.status) {
        case 'pending': pending++; break;
        case 'in_progress': running++; break;
        case 'completed': done++; break;
        case 'failed': failed++; break;
        case 'awaiting_approval': awaiting++; break;
      }
    }
    return { pending, running, done, failed, awaiting, total: tasks.value.length };
  });

  const recentTasks = computed(() =>
    [...tasks.value]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8),
  );

  // ─── Task refresh ────────────────────────────────────
  let refreshTasksInFlight = false;

  async function refreshTasks() {
    if (refreshTasksInFlight) return;
    refreshTasksInFlight = true;
    try {
      const companyFilter = activeCompany.value?.name ? { company: activeCompany.value.name } : undefined;
      const result = await fetchTasks(companyFilter);
      const extracted = extractTasks(result);
      if (extracted.length > 0 || tasks.value.length === 0) {
        tasks.value = extracted;
      }
    } catch (err) {
      console.warn('[useDashboard] refreshTasks failed, keeping existing data:', err);
    } finally {
      refreshTasksInFlight = false;
    }
  }

  async function refreshCompanies() {
    try { await loadCompanies(); } catch (err) { console.warn('[useDashboard] refreshCompanies failed:', err); }
  }

  async function refreshAgents() {
    if (!activeCompany.value?.name) return;
    try {
      agents.value = await fetchAgents(activeCompany.value.name);
    } catch (err) {
      console.warn('[useDashboard] refreshAgents failed:', err);
    }
  }

  // ─── WebSocket event routing ─────────────────────────
  // NOTE: Task/agent refresh and event feed processing are handled globally
  // by useRealtimeSync. This listener only handles dashboard-specific events.
  ws.on('*', (event) => {
    if (event.type === 'metrics_update') {
      const d = event.data as Record<string, unknown> | null;
      if (d && typeof d.total_tokens_used === 'number') {
        feed.updateTotalCost(d.total_tokens_used);
      }
    }

    if (event.type === 'circuit_breaker_tripped') {
      isPaused.value = true;
      toast.warning('Circuit breaker tripped — task execution paused');
    }

    if (event.type === 'circuit_breaker_reset') {
      isPaused.value = false;
      toast.success('Circuit breaker reset — system recovered');
    }
  });

  // ─── Company actions ─────────────────────────────────
  async function handleStart() {
    try {
      await post('/companies', { name: 'default' });
      await loadCompanies();
      toast.success('Company started');
    } catch (err) {
      toast.error(normalizeError(err, 'Failed to start company'));
    }
  }

  async function handleStop() {
    const company = activeCompany.value?.name;
    if (!company) {
      toast.error('No active company');
      return;
    }
    try {
      await post('/ralph-loop/pause', { company });
      isPaused.value = true;
      toast.success('Task loop paused');
    } catch (err) {
      toast.error(normalizeError(err, 'Failed to pause loop'));
    }
  }

  async function handleResume() {
    const company = activeCompany.value?.name;
    if (!company) {
      toast.error('No active company');
      return;
    }
    try {
      await post('/ralph-loop/resume', { company });
      isPaused.value = false;
      toast.success('Task loop resumed');
    } catch (err) {
      toast.error(normalizeError(err, 'Failed to resume loop'));
    }
  }

  async function handleApproveAll() {
    const awaiting = tasks.value.filter((t) => t.status === 'awaiting_approval');
    try {
      await Promise.all(
        awaiting.map((t) => post(`/tasks/${encodeURIComponent(t.id)}/approve`, {})),
      );
      await refreshTasks();
      toast.success(`Approved ${awaiting.length} tasks`);
    } catch (err) {
      toast.error(normalizeError(err, 'Failed to approve tasks'));
    }
  }

  // ─── Lifecycle ───────────────────────────────────────
  let taskPollTimer: ReturnType<typeof setInterval> | null = null;
  let loadingTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  // Register spotlight actions
  registerSpotlightAction('create-task', openCreateTask);
  registerSpotlightAction('approve-all', handleApproveAll);

  onMounted(async () => {
    loadingTimeoutTimer = setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false;
        hasError.value = true;
        toast.warning('Loading timed out — backend may be unavailable');
      }
    }, LOAD_TIMEOUT_MS);

    try {
      const companyName = activeCompany.value?.name;
      const taskFilter = companyName ? { company: companyName } : undefined;
      const [c, t, e] = await Promise.allSettled([
        loadCompanies(),
        fetchTasks(taskFilter),
        fetchRecentEvents(),
      ]);

      if (t.status === 'fulfilled') {
        tasks.value = extractTasks(t.value);
      } else {
        setTimeout(() => refreshTasks(), 2_000);
      }

      if (e.status === 'fulfilled') {
        ensureArray<ShazamEvent>(e.value).forEach((ev) => feed.processEvent(ev));
      }

      if (c.status === 'rejected' && t.status === 'rejected') {
        hasError.value = true;
        toast.warning('Backend unreachable — showing cached data');
      }

      // Load agents with tokens_used for accurate cost calculation
      await refreshAgents();
    } catch (err) {
      hasError.value = true;
      toast.error(normalizeError(err, 'Failed to load dashboard'));
    } finally {
      if (loadingTimeoutTimer) clearTimeout(loadingTimeoutTimer);
      isLoading.value = false;
    }

    taskPollTimer = setInterval(async () => {
      await refreshTasks();
      await refreshCompanies();
      await refreshAgents();
    }, POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (taskPollTimer) clearInterval(taskPollTimer);
    if (loadingTimeoutTimer) clearTimeout(loadingTimeoutTimer);
  });

  // React to useRealtimeSync signals (debounced by the global sync layer)
  watch(taskRefreshTick, () => {
    refreshTasks();
  });

  watch(agentRefreshTick, () => {
    refreshAgents();
  });

  return {
    // State
    isLoading,
    hasError,
    isPaused,
    tasks,

    // Company & Agents
    activeCompany,
    agents,

    // Derived
    taskStats,
    recentTasks,
    totalCost,
    totalTokens,

    // Feed & WS
    feed,
    ws,

    // Actions
    handleStart,
    handleStop,
    handleResume,
    handleApproveAll,

    // Create Task
    showCreateTask,
    isCreatingTask,
    createTaskForm,
    openCreateTask,
    closeCreateTask,
    handleCreateTask,

    // Complexity analysis
    complexityWarning,
    forceCreateTask,
    createWithDecomposition,
  };
}
