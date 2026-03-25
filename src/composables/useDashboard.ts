import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { fetchTasks } from '@/api/taskService';
import { fetchRecentEvents } from '@/api/eventService';
import { useWebSocket } from '@/composables/useWebSocket';
import { useEventFeed } from '@/composables/useEventFeed';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useToast } from '@/composables/useToast';
import { useDebouncedRefresh, LOAD_TIMEOUT_MS, POLL_INTERVAL_MS } from '@/composables/useAsyncState';
import { ensureArray, normalizeError } from '@/api/utils';
import { post } from '@/api/http';
import type { Task, ShazamEvent, PaginatedResult } from '@/types';

/** Task event types that trigger a data refresh */
const TASK_EVENTS = new Set([
  'task_status_change', 'task_completed', 'task_started', 'task_failed', 'task_created',
]);

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
  const isPaused = ref(false);

  // ─── Derived ──────────────────────────────────────────
  const totalTokens = computed(() =>
    activeCompany.value?.agents.reduce((sum, a) => sum + a.tokens_used, 0) ?? 0,
  );

  const taskStats = computed(() => ({
    pending: tasks.value.filter((t) => t.status === 'pending').length,
    running: tasks.value.filter((t) => t.status === 'in_progress').length,
    done: tasks.value.filter((t) => t.status === 'completed').length,
    failed: tasks.value.filter((t) => t.status === 'failed').length,
    awaiting: tasks.value.filter((t) => t.status === 'awaiting_approval').length,
    total: tasks.value.length,
  }));

  const recentTasks = computed(() =>
    [...tasks.value]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8),
  );

  // ─── Task refresh ────────────────────────────────────
  async function refreshTasks() {
    try {
      const companyFilter = activeCompany.value?.name ? { company: activeCompany.value.name } : undefined;
      const result = await fetchTasks(companyFilter);
      const extracted = extractTasks(result);
      if (extracted.length > 0 || tasks.value.length === 0) {
        tasks.value = extracted;
      }
    } catch {
      // Silent — keep existing data
    }
  }

  const [debouncedRefreshTasks, cleanupDebounce] = useDebouncedRefresh(() => refreshTasks());

  async function refreshCompanies() {
    try { await loadCompanies(); } catch { /* silent */ }
  }

  // ─── WebSocket event routing ─────────────────────────
  ws.on('*', (event) => {
    feed.processEvent(event);

    if (TASK_EVENTS.has(event.type)) {
      debouncedRefreshTasks();
    }

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

  function handleStop() {
    toast.info('Stop must be executed via CLI: shazam stop');
  }

  function handleResume() {
    toast.info('Resume must be executed via CLI: /resume');
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

      feed.updateTotalCost(totalTokens.value);
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
      feed.updateTotalCost(totalTokens.value);
    }, POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (taskPollTimer) clearInterval(taskPollTimer);
    if (loadingTimeoutTimer) clearTimeout(loadingTimeoutTimer);
    cleanupDebounce();
  });

  // Reload when active project changes
  watch(() => activeCompany.value?.name, (name, oldName) => {
    if (name && name !== oldName) {
      refreshTasks();
      refreshCompanies();
    }
  });

  return {
    // State
    isLoading,
    hasError,
    isPaused,
    tasks,

    // Company
    activeCompany,

    // Derived
    taskStats,
    recentTasks,

    // Feed & WS
    feed,
    ws,

    // Actions
    handleStart,
    handleStop,
    handleResume,
    handleApproveAll,
  };
}
