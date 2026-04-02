import { ref, computed, watch, onMounted } from 'vue';
import { useActiveCompany } from './useActiveCompany';
import { useWebSocket } from './useWebSocket';
import { useAsyncState, POLL_INTERVAL_MS } from './useAsyncState';
import { taskRefreshTick, agentRefreshTick } from './useRealtimeSync';
import {
  loadTasks,
  loadAgents,
  computeTaskStats,
  computeTotalTokens,
  computeTotalBudget,
  computeTotalCost,
  sortAgentsByUsage,
  fetchContextMetrics,
  fetchAgentScores,
} from '@/api/metricsService';
import type { AgentScore } from '@/api/metricsService';
import type { Task, AgentWorker, AgentStatus, CircuitBreakerStatus } from '@/types';
import { getDataString, getDataNumber } from '@/utils/eventGuards';

export interface CostSnapshot {
  timestamp: number;
  totalTokens: number;
  totalCost: number;
  agents: Record<string, number>;
}

export interface ContextEntry {
  agent: string;
  lastInput: number;
  lastOutput: number;
  peakInput: number;
  capacity: number;
  usagePercent: number;
  warning: boolean;
}

const MAX_HISTORY = 48;

export function useMetrics() {
  const { activeCompany, loadCompanies } = useActiveCompany();
  const ws = useWebSocket();

  const tasks = ref<Task[]>([]);
  const agents = ref<AgentWorker[]>([]);
  const costHistory = ref<CostSnapshot[]>([]);
  const contextEntries = ref<ContextEntry[]>([]);
  const agentScores = ref<Record<string, AgentScore>>({});
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
  const totalCost = computed(() => computeTotalCost(totalTokens.value, agents.value));
  const sortedAgents = computed(() => sortAgentsByUsage(agents.value));

  const busyAgentsCount = computed(() =>
    agents.value.filter((a) => a.status === 'busy').length
  );

  const idleAgentsCount = computed(() =>
    agents.value.filter((a) => a.status === 'idle').length
  );

  // ─── Cost History ─────────────────────────────────────

  function recordCostSnapshot() {
    costHistory.value.push({
      timestamp: Date.now(),
      totalTokens: totalTokens.value,
      totalCost: totalCost.value,
      agents: Object.fromEntries(agents.value.map((a) => [a.name, a.tokens_used])),
    });
    if (costHistory.value.length > MAX_HISTORY) {
      costHistory.value.shift();
    }
  }

  // ─── Data Loading ──────────────────────────────────────

  async function fetchAgentData() {
    if (!activeCompany.value) return;
    agents.value = await loadAgents(activeCompany.value.name);
  }

  async function fetchContextData() {
    try {
      const data = await fetchContextMetrics();
      contextEntries.value = data;
    } catch {
      // silent — context data is optional
    }
  }

  async function fetchScores() {
    try {
      agentScores.value = await fetchAgentScores();
    } catch {
      // silent — scores are optional
    }
  }

  const { isLoading, error, execute: loadData } = useAsyncState(
    async () => {
      const filter = activeCompany.value?.name ? { company: activeCompany.value.name } : undefined;
      const [, t] = await Promise.allSettled([loadCompanies(), loadTasks(filter)]);
      if (t.status === 'fulfilled') {
        tasks.value = t.value.items;
      }
      await fetchAgentData();
      await fetchContextData();
      await fetchScores();
      recordCostSnapshot();
      return true;
    },
    { fallbackError: 'Failed to load metrics', pollInterval: POLL_INTERVAL_MS },
  );

  // ─── WebSocket Event Handling ──────────────────────────
  // NOTE: Task and agent refresh is handled globally by useRealtimeSync.
  // This listener only handles metrics-specific events (circuit breaker, agent status, metrics_update).

  ws.on('*', (event) => {
    if (event.type === 'circuit_breaker_tripped') {
      circuitBreaker.value = {
        consecutive_failures: getDataNumber(event, 'consecutive_failures', circuitBreaker.value.consecutive_failures + 1),
        last_error: getDataString(event, 'last_error') || null,
        tripped: true,
        threshold: getDataNumber(event, 'threshold', 3),
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

    if (event.type === 'agent_status_change') {
      const agentName = event.agent ?? (getDataString(event, 'agent') || getDataString(event, 'agent_name') || undefined);
      const newStatus = getDataString(event, 'to') || getDataString(event, 'status') || undefined;
      if (agentName && newStatus) {
        const agent = agents.value.find((a) => a.name === agentName);
        if (agent) {
          agent.status = newStatus as AgentStatus;
        }
      }
      return;
    }
  });

  // ─── Watchers ──────────────────────────────────────────

  // React to useRealtimeSync's debounced refresh signals
  watch(taskRefreshTick, async () => {
    try {
      const filter = activeCompany.value?.name ? { company: activeCompany.value.name } : undefined;
      const result = await loadTasks(filter);
      if (result.items.length > 0 || tasks.value.length === 0) {
        tasks.value = result.items;
      }
    } catch (err) {
      console.warn('Metrics task refresh failed, keeping existing data:', err);
    }
  });

  watch(agentRefreshTick, () => {
    fetchAgentData();
    fetchContextData();
    fetchScores();
  });

  watch(() => activeCompany.value, (newCompany) => {
    if (newCompany) fetchAgentData();
  });

  // ─── Lifecycle ─────────────────────────────────────────

  onMounted(loadData);

  return {
    // State
    tasks,
    agents,
    circuitBreaker,
    costHistory,
    contextEntries,
    agentScores,

    // Computed
    taskStats,
    totalTokens,
    totalBudget,
    totalCost,
    sortedAgents,
    idleAgentsCount,
    busyAgentsCount,

    // Loading state
    isLoading,
    error,

    // WebSocket (exposed for template)
    ws,
  };
}
