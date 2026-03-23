import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Task, AgentWorker, CircuitBreakerStatus } from '@/types';

const COST_PER_1K_TOKENS = 0.003;

/**
 * Metrics Store — aggregated system metrics derived from tasks and agents.
 *
 * Provides computed dashboard-level statistics.
 * Fed by task/agent data and WebSocket metrics_update events.
 */
export const useMetricsStore = defineStore('metrics', () => {
  // ─── State ──────────────────────────────────────────

  const tasks = ref<Task[]>([]);
  const agents = ref<AgentWorker[]>([]);
  const circuitBreaker = ref<CircuitBreakerStatus>({
    consecutive_failures: 0,
    last_error: null,
    tripped: false,
    threshold: 3,
  });
  const uptimeSeconds = ref(0);

  // ─── Getters ────────────────────────────────────────

  const taskStats = computed(() => {
    const stats = { total: 0, completed: 0, failed: 0, pending: 0, in_progress: 0, paused: 0, awaiting_approval: 0 };
    for (const t of tasks.value) {
      stats.total++;
      if (t.status in stats) {
        const key = t.status as keyof typeof stats;
        stats[key]++;
      }
    }
    return stats;
  });

  const totalTokens = computed(() =>
    agents.value.reduce((sum, a) => sum + a.tokens_used, 0)
  );

  const totalBudget = computed(() =>
    agents.value.reduce((sum, a) => sum + a.budget, 0)
  );

  const totalCost = computed(() =>
    (totalTokens.value / 1000) * COST_PER_1K_TOKENS
  );

  const formattedCost = computed(() =>
    totalCost.value < 0.01 ? '<$0.01' : `$${totalCost.value.toFixed(2)}`
  );

  const budgetUsagePercent = computed(() =>
    totalBudget.value > 0 ? Math.round((totalTokens.value / totalBudget.value) * 100) : 0
  );

  const agentsByUsage = computed(() =>
    [...agents.value].sort((a, b) => b.tokens_used - a.tokens_used)
  );

  // ─── Actions ────────────────────────────────────────

  function setTasks(newTasks: Task[]): void {
    tasks.value = newTasks;
  }

  function setAgents(newAgents: AgentWorker[]): void {
    agents.value = newAgents;
  }

  function updateCircuitBreaker(status: Partial<CircuitBreakerStatus>): void {
    circuitBreaker.value = { ...circuitBreaker.value, ...status };
  }

  function updateFromMetricsEvent(data: Record<string, unknown>): void {
    if (typeof data.uptime_seconds === 'number') uptimeSeconds.value = data.uptime_seconds;
    if (typeof data.circuit_breaker_tripped === 'boolean') {
      circuitBreaker.value = { ...circuitBreaker.value, tripped: data.circuit_breaker_tripped };
    }
  }

  return {
    tasks,
    agents,
    circuitBreaker,
    uptimeSeconds,
    taskStats,
    totalTokens,
    totalBudget,
    totalCost,
    formattedCost,
    budgetUsagePercent,
    agentsByUsage,
    setTasks,
    setAgents,
    updateCircuitBreaker,
    updateFromMetricsEvent,
  };
});
