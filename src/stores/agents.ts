import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchAgents } from '@/api/companyService';
import { fetchSessionPool } from '@/api/configService';
import { fetchTasks } from '@/api/taskService';
import type { AgentWorker, AgentStatus } from '@/types';

/**
 * Agent Store — central state for agent data and real-time status tracking.
 *
 * Provides enriched agent statuses by cross-referencing sessions and tasks.
 */
export const useAgentStore = defineStore('agents', () => {
  // ─── State ──────────────────────────────────────────

  const agents = ref<AgentWorker[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ────────────────────────────────────────

  const agentsByStatus = computed(() => {
    const groups: Record<string, AgentWorker[]> = {};
    for (const agent of agents.value) {
      const s = agent.status;
      if (!groups[s]) groups[s] = [];
      groups[s].push(agent);
    }
    return groups;
  });

  const busyCount = computed(() =>
    agents.value.filter((a) => ['busy', 'working', 'executing'].includes(a.status)).length
  );

  const idleCount = computed(() =>
    agents.value.filter((a) => a.status === 'idle').length
  );

  // ─── Actions ────────────────────────────────────────

  async function load(companyName: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      agents.value = await fetchAgents(companyName);
      await enrichStatuses();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load agents';
    } finally {
      isLoading.value = false;
    }
  }

  /** Cross-reference sessions + tasks to derive real agent statuses */
  async function enrichStatuses(): Promise<void> {
    try {
      const [sessionPool, taskResult] = await Promise.all([
        fetchSessionPool().catch(() => null),
        fetchTasks().catch(() => ({ items: [], total: 0, page: 1, page_size: 0, total_pages: 0 })),
      ]);

      const busyAgents = new Set<string>();
      for (const task of taskResult.items) {
        if (task.status === 'in_progress' && task.assigned_to) {
          busyAgents.add(task.assigned_to);
        }
      }

      const aliveAgents = new Set<string>();
      if (sessionPool?.sessions) {
        for (const [name, session] of Object.entries(sessionPool.sessions)) {
          if (!session.idle) aliveAgents.add(name);
        }
      }

      for (const agent of agents.value) {
        if (agent.status !== 'idle') continue;
        if (busyAgents.has(agent.name)) agent.status = 'busy';
        else if (!aliveAgents.has(agent.name)) agent.status = 'offline';
      }
    } catch {
      // Best-effort enrichment
    }
  }

  function updateStatus(agentName: string, status: AgentStatus): void {
    const agent = agents.value.find((a) => a.name === agentName);
    if (agent) agent.status = status;
  }

  function findAgent(name: string): AgentWorker | undefined {
    return agents.value.find((a) => a.name === name);
  }

  return {
    agents,
    isLoading,
    error,
    agentsByStatus,
    busyCount,
    idleCount,
    load,
    enrichStatuses,
    updateStatus,
    findAgent,
  };
});
