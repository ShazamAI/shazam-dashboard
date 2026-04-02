import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useActiveCompany } from './useActiveCompany';
import { useWebSocket } from './useWebSocket';
import { useAsyncState } from './useAsyncState';
import { loadOrgChart, updateNodeStatuses, normalizeAgentStatus } from '@/api/agentService';
import { fetchAgentSubagents } from '@/api/subagentService';
import { normalizeError } from '@/api/utils';
import { getDomainColor } from '@/constants/colors';
import type { OrgChartNode, AgentStatus, DomainInfo, StatusDisplayConfig } from '@/types';
import { getDataString } from '@/utils/eventGuards';

export const STATUS_DISPLAY: Record<string, StatusDisplayConfig> = {
  idle: { dot: 'bg-emerald-400', label: 'Idle' },
  busy: { dot: 'bg-amber-400 animate-pulse', label: 'Busy' },
  working: { dot: 'bg-amber-400 animate-pulse', label: 'Working' },
  executing: { dot: 'bg-cyan-400 animate-pulse', label: 'Executing' },
  waiting: { dot: 'bg-yellow-400 animate-pulse', label: 'Waiting' },
  paused: { dot: 'bg-gray-500', label: 'Paused' },
  error: { dot: 'bg-red-500', label: 'Error' },
  offline: { dot: 'bg-gray-600', label: 'Offline' },
};

// ─── Helpers ───────────────────────────────────────────

function flattenNodes(nodes: OrgChartNode[]): OrgChartNode[] {
  const result: OrgChartNode[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.reports.length > 0) result.push(...flattenNodes(n.reports));
  }
  return result;
}

/**
 * Composable for the OrgChart page — data loading, real-time status
 * updates via WebSocket, navigation, and computed stats/domains.
 */
export function useOrgChart() {
  const router = useRouter();
  const { activeCompany, loadCompanies } = useActiveCompany();
  const ws = useWebSocket();

  const orgChart = ref<OrgChartNode[]>([]);

  async function enrichWithSubagents() {
    const enrichNode = async (node: OrgChartNode) => {
      try {
        node.subagents = await fetchAgentSubagents(node.name);
      } catch {
        node.subagents = [];
      }
      for (const child of node.reports) {
        await enrichNode(child);
      }
    };
    for (const root of orgChart.value) {
      await enrichNode(root);
    }
  }

  const { isLoading, error, execute: loadData } = useAsyncState(
    async () => {
      await loadCompanies();
      if (activeCompany.value) {
        orgChart.value = await loadOrgChart(activeCompany.value.name);
        await enrichWithSubagents();
      }
      return true;
    },
    { fallbackError: 'Failed to load org chart' },
  );

  async function refreshOrgChart() {
    if (!activeCompany.value) return;
    try {
      orgChart.value = await loadOrgChart(activeCompany.value.name);
      await enrichWithSubagents();
    } catch (err) {
      console.warn('Failed to refresh org chart:', normalizeError(err, 'Unknown error'));
    }
  }

  function navigateToAgent(agentName: string) {
    router.push({ path: '/agents', query: { highlight: agentName } });
  }

  // ─── Computed stats from tree ──────────────────────────

  const allNodes = computed(() => flattenNodes(orgChart.value));
  const totalAgents = computed(() => allNodes.value.length);

  const statusCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const n of allNodes.value) {
      counts[n.status] = (counts[n.status] ?? 0) + 1;
    }
    return counts;
  });

  const domains = computed<DomainInfo[]>(() => {
    const map = new Map<string, number>();
    for (const n of allNodes.value) {
      const d = n.domain ?? 'unassigned';
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        color: getDomainColor(name),
      }));
  });

  // ─── WebSocket: real-time status updates ───────────────

  const unsubWs = ws.on('*', (event) => {
    try {
      if (event.type === 'agent_status_change') {
        const agentName = event.agent ?? (getDataString(event, 'agent') || getDataString(event, 'agent_name') || undefined);
        const rawStatus = getDataString(event, 'to') || getDataString(event, 'status') || undefined;
        if (agentName && rawStatus) {
          updateNodeStatuses(orgChart.value, agentName, normalizeAgentStatus(rawStatus));
        }
        return;
      }

      const taskEvents = new Set(['task_status_change', 'task_started', 'task_completed', 'task_failed']);
      if (taskEvents.has(event.type)) {
        const agentName = getDataString(event, 'assigned_to') || event.agent || undefined;
        if (!agentName) return;

        let newStatus: AgentStatus;
        if (event.type === 'task_started') {
          newStatus = 'busy';
        } else if (event.type === 'task_completed' || event.type === 'task_failed') {
          newStatus = 'idle';
        } else {
          const toStatus = getDataString(event, 'to') || undefined;
          newStatus = toStatus ? normalizeAgentStatus(toStatus) : 'idle';
        }
        updateNodeStatuses(orgChart.value, agentName, newStatus);
      }
    } catch (err) {
      console.warn('[OrgChart] WS event handler error:', err);
    }
  });

  // ─── Lifecycle ─────────────────────────────────────────

  onMounted(loadData);

  onUnmounted(() => {
    unsubWs();
  });

  watch(() => activeCompany.value, (newCompany) => {
    if (newCompany) refreshOrgChart();
  });

  return {
    orgChart,
    isLoading,
    error,
    navigateToAgent,
    totalAgents,
    statusCounts,
    domains,
  };
}
