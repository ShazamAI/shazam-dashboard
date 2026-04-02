import { ref, computed, type Ref } from 'vue';
import type { AgentWorker } from '@/types';
import type { WorkspaceTab } from '@/components/features/WorkspaceTabs.vue';

// ─── Workspace Definitions ──────────────────────────────

const WORKSPACE_DEFS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'bg-violet-500/10 text-violet-400' },
  { id: 'vscode', label: 'VS Code', icon: '💻', color: 'bg-sky-500/10 text-sky-400' },
  { id: 'backend', label: 'Backend', icon: '⚙️', color: 'bg-emerald-500/10 text-emerald-400' },
  { id: 'general', label: 'General', icon: '🔮', color: 'bg-gray-500/10 text-gray-400' },
] as const;

const WORKSPACE_LABELS: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Dashboard Team', icon: '📊' },
  vscode: { label: 'VS Code Team', icon: '💻' },
  backend: { label: 'Backend Team', icon: '⚙️' },
  general: { label: 'General', icon: '🔮' },
};

const WORKSPACE_ORDER = ['dashboard', 'vscode', 'backend', 'general'];

// ─── Helpers ──────────────────────────────────────────────

export function inferWorkspace(agent: AgentWorker): string {
  const d = (agent.domain ?? '').toLowerCase();
  if (d.includes('dashboard') || d.includes('frontend')) return 'dashboard';
  if (d.includes('vscode') || d.includes('extension')) return 'vscode';
  if (d.includes('backend') || d.includes('api')) return 'backend';
  return 'general';
}

// ─── Types ────────────────────────────────────────────────

export interface WorkspaceGroup {
  id: string;
  label: string;
  icon: string;
  agents: AgentWorker[];
}

export interface AgentStats {
  total: number;
  active: number;
  idle: number;
  offline: number;
  errors: number;
}

// ─── Composable ───────────────────────────────────────────

export function useAgentFilters(agents: Ref<AgentWorker[]>) {
  const activeWorkspace = ref('all');
  const searchQuery = ref('');
  const statusFilter = ref<string>('all');

  // Workspace tabs derived from agent data
  const workspaceTabs = computed<WorkspaceTab[]>(() => {
    const counts: Record<string, number> = {};
    for (const agent of agents.value) {
      const ws = inferWorkspace(agent);
      counts[ws] = (counts[ws] ?? 0) + 1;
    }

    return WORKSPACE_DEFS
      .filter(d => (counts[d.id] ?? 0) > 0)
      .map(d => ({ ...d, count: counts[d.id] ?? 0 }));
  });

  // Filtered agents by workspace, status, and search (single-pass)
  const filteredAgents = computed(() => {
    const ws = activeWorkspace.value;
    const sf = statusFilter.value;
    const q = searchQuery.value.trim().toLowerCase();

    return agents.value.filter((a) => {
      if (ws !== 'all' && inferWorkspace(a) !== ws) return false;
      if (sf !== 'all' && a.status !== sf) return false;
      if (q && !(
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        (a.domain ?? '').toLowerCase().includes(q) ||
        (a.supervisor ?? '').toLowerCase().includes(q)
      )) return false;
      return true;
    });
  });

  // Stats summary
  const stats = computed<AgentStats>(() => {
    const all = agents.value;
    return {
      total: all.length,
      active: all.filter(a => ['busy', 'working', 'executing'].includes(a.status)).length,
      idle: all.filter(a => a.status === 'idle').length,
      offline: all.filter(a => a.status === 'offline').length,
      errors: all.filter(a => a.status === 'error').length,
    };
  });

  // Grouped agents for display
  const groupedAgents = computed<WorkspaceGroup[]>(() => {
    if (activeWorkspace.value !== 'all') {
      const tab = workspaceTabs.value.find(t => t.id === activeWorkspace.value);
      return [{
        id: activeWorkspace.value,
        label: tab?.label ?? activeWorkspace.value,
        icon: tab?.icon ?? '📦',
        agents: filteredAgents.value,
      }];
    }

    const groups: Record<string, AgentWorker[]> = {};
    for (const agent of filteredAgents.value) {
      const ws = inferWorkspace(agent);
      if (!groups[ws]) groups[ws] = [];
      groups[ws].push(agent);
    }

    return WORKSPACE_ORDER
      .filter(id => groups[id]?.length)
      .map(id => ({
        id,
        label: WORKSPACE_LABELS[id]?.label ?? id,
        icon: WORKSPACE_LABELS[id]?.icon ?? '📦',
        agents: groups[id] ?? [],
      }));
  });

  function selectWorkspace(tabId: string) {
    activeWorkspace.value = tabId;
  }

  function clearFilters() {
    searchQuery.value = '';
    statusFilter.value = 'all';
    activeWorkspace.value = 'all';
  }

  return {
    activeWorkspace,
    searchQuery,
    statusFilter,
    workspaceTabs,
    filteredAgents,
    stats,
    groupedAgents,
    selectWorkspace,
    clearFilters,
  };
}
