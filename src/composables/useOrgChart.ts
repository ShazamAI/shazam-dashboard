import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useActiveCompany } from './useActiveCompany';
import { useWebSocket } from './useWebSocket';
import { useAsyncState } from './useAsyncState';
import { loadOrgChart, updateNodeStatuses, normalizeAgentStatus } from '@/api/agentService';
import { normalizeError } from '@/api/utils';
import type { OrgChartNode, AgentStatus } from '@/types';

/**
 * Composable for the OrgChart page — data loading, real-time status
 * updates via WebSocket, and navigation to agents.
 */
export function useOrgChart() {
  const router = useRouter();
  const { activeCompany, loadCompanies } = useActiveCompany();
  const ws = useWebSocket();

  const orgChart = ref<OrgChartNode[]>([]);

  const { isLoading, error, execute: loadData } = useAsyncState(
    async () => {
      await loadCompanies();
      if (activeCompany.value) {
        orgChart.value = await loadOrgChart(activeCompany.value.name);
      }
      return true;
    },
    { fallbackError: 'Failed to load org chart' },
  );

  async function refreshOrgChart() {
    if (!activeCompany.value) return;
    try {
      orgChart.value = await loadOrgChart(activeCompany.value.name);
    } catch (err) {
      console.warn('Failed to refresh org chart:', normalizeError(err, 'Unknown error'));
    }
  }

  function navigateToAgent(agentName: string) {
    router.push({ path: '/agents', query: { highlight: agentName } });
  }

  // ─── WebSocket: real-time status updates ───────────────

  ws.on('*', (event) => {
    if (event.type === 'agent_status_change') {
      const data = event.data as Record<string, unknown> | null;
      const agentName = (event.agent ?? data?.agent ?? data?.agent_name) as string | undefined;
      const rawStatus = (data?.to ?? data?.status) as string | undefined;
      if (agentName && rawStatus) {
        updateNodeStatuses(orgChart.value, agentName, normalizeAgentStatus(rawStatus));
      }
      return;
    }

    const taskEvents = new Set(['task_status_change', 'task_started', 'task_completed', 'task_failed']);
    if (taskEvents.has(event.type)) {
      const data = event.data as Record<string, unknown> | null;
      const agentName = (data?.assigned_to ?? event.agent) as string | undefined;
      if (!agentName) return;

      let newStatus: AgentStatus;
      if (event.type === 'task_started') {
        newStatus = 'busy';
      } else if (event.type === 'task_completed' || event.type === 'task_failed') {
        newStatus = 'idle';
      } else {
        const toStatus = data?.to as string | undefined;
        newStatus = toStatus ? normalizeAgentStatus(toStatus) : 'idle';
      }
      updateNodeStatuses(orgChart.value, agentName, newStatus);
    }
  });

  // ─── Lifecycle ─────────────────────────────────────────

  onMounted(loadData);

  watch(() => activeCompany.value, (newCompany) => {
    if (newCompany) refreshOrgChart();
  });

  return {
    orgChart,
    isLoading,
    error,
    navigateToAgent,
  };
}
