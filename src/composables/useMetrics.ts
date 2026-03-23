import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useActiveCompany } from './useActiveCompany';
import { useWebSocket } from './useWebSocket';
import { useAsyncState, useDebouncedRefresh, POLL_INTERVAL_MS } from './useAsyncState';
import {
  loadTasks,
  loadAgents,
  computeTaskStats,
  computeTotalTokens,
  computeTotalBudget,
  computeTotalCost,
  sortAgentsByUsage,
} from '@/api/metricsService';
import type { Task, AgentWorker, AgentStatus, CircuitBreakerStatus } from '@/types';

const TASK_EVENTS = new Set([
  'task_status_change', 'task_completed', 'task_started', 'task_failed', 'task_created',
]);

export function useMetrics() {
  const { activeCompany, loadCompanies } = useActiveCompany();
  const ws = useWebSocket();

  const tasks = ref<Task[]>([]);
  const agents = ref<AgentWorker[]>([]);
  const circuitBreaker = ref<CircuitBreakerStatus>({
    consecutive_failures: 0,
    last_error: null,
    tripped: false,
    threshold: 3,
  });

  // ─── Computed ───────────────────────────────────────────

  const taskStats = computed(() => computeTaskStats(tasks.value));
  const totalTokens = computed(() => computeTotalTokens(agents.value));
  const totalBudget = computed(() => computeTotalBudget(agents.value));
  const totalCost = computed(() => computeTotalCost(totalTokens.value));
  const sortedAgents = computed(() => sortAgentsByUsage(agents.value));

  const activeSessionsCount = computed(() =>
    agents.value.filter((a) => a.status === 'busy').length
  );

  const idleAgentsCount = computed(() =>
    agents.value.filter((a) => a.status === 'idle').length
  );

  const busyAgentsCount = computed(() =>
    agents.value.filter((a) => a.status === 'busy').length
  );

  // ─── Data Loading ──────────────────────────────────────

  async function fetchAgentData() {
    if (!activeCompany.value) return;
    agents.value = await loadAgents(activeCompany.value.name);
  }

  async function refreshTasks() {
    try {
      const result = await loadTasks();
      const items = result.items;
      if (items.length > 0 || tasks.value.length === 0) {
        tasks.value = items;
      }
    } catch {
      // Silent refresh — keep existing data
    }
  }

  const { isLoading, error, execute: loadData } = useAsyncState(
    async () => {
      const [, t] = await Promise.allSettled([loadCompanies(), loadTasks()]);
      if (t.status === 'fulfilled') {
        tasks.value = t.value.items;
      }
      await fetchAgentData();
      return true;
    },
    { fallbackError: 'Failed to load metrics', pollInterval: POLL_INTERVAL_MS },
  );

  const [debouncedRefresh, cleanupDebounce] = useDebouncedRefresh(() => refreshTasks());

  // ─── WebSocket Event Handling ──────────────────────────

  ws.on('*', (event) => {
    if (event.type === 'circuit_breaker_tripped') {
      const d = event.data as Record<string, unknown> | null;
      circuitBreaker.value = {
        consecutive_failures: (d?.consecutive_failures as number) ?? circuitBreaker.value.consecutive_failures + 1,
        last_error: (d?.last_error as string) ?? null,
        tripped: true,
        threshold: (d?.threshold as number) ?? 3,
      };
      return;
    }

    if (event.type === 'circuit_breaker_reset') {
      circuitBreaker.value = {
        ...circuitBreaker.value,
        consecutive_failures: 0,
        last_error: null,
        tripped: false,
      };
      return;
    }

    if (TASK_EVENTS.has(event.type)) {
      debouncedRefresh();
      return;
    }

    if (event.type === 'agent_status_change') {
      const d = event.data as Record<string, unknown> | null;
      const agentName = (event.agent ?? d?.agent ?? d?.agent_name) as string | undefined;
      const newStatus = (d?.to ?? d?.status) as string | undefined;
      if (agentName && newStatus) {
        const agent = agents.value.find((a) => a.name === agentName);
        if (agent) {
          agent.status = newStatus as AgentStatus;
        }
      }
      return;
    }

    if (event.type === 'metrics_update') {
      debouncedRefresh();
    }
  });

  // ─── Watchers ──────────────────────────────────────────

  watch(() => activeCompany.value, (newCompany) => {
    if (newCompany) fetchAgentData();
  });

  // ─── Lifecycle ─────────────────────────────────────────

  onMounted(loadData);
  onUnmounted(cleanupDebounce);

  return {
    // State
    tasks,
    agents,
    circuitBreaker,

    // Computed
    taskStats,
    totalTokens,
    totalBudget,
    totalCost,
    sortedAgents,
    activeSessionsCount,
    idleAgentsCount,
    busyAgentsCount,

    // Loading state
    isLoading,
    error,

    // WebSocket (exposed for template)
    ws,
  };
}
