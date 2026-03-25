import { fetchAgents, createAgent, updateAgent, fetchOrgChart } from './companyService';
import { fetchSessionPool } from './configService';
import { fetchTasks } from './taskService';
import type { AgentWorker, AgentStatus, OrgChartNode, CreateAgentPayload } from '@/types';

// ─── Re-exports for convenience ──────────────────────────
export { fetchOrgChart } from './companyService';
export type { CreateAgentPayload } from '@/types';

// ─── Agent Data Loading ──────────────────────────────────

export async function loadAgents(companyName: string): Promise<AgentWorker[]> {
  return fetchAgents(companyName);
}

export async function loadAndEnrichAgents(companyName: string): Promise<AgentWorker[]> {
  const agents = await fetchAgents(companyName);
  await enrichAgentStatuses(agents);
  return agents;
}

export async function submitCreateAgent(companyName: string, payload: CreateAgentPayload): Promise<void> {
  await createAgent(companyName, payload);
}

export async function submitUpdateAgent(companyName: string, agent: Partial<AgentWorker>): Promise<void> {
  if (!agent.name) throw new Error('Agent name is required for update');
  await updateAgent(companyName, agent.name, agent);
}

export async function loadOrgChart(companyName: string): Promise<OrgChartNode[]> {
  return fetchOrgChart(companyName);
}

// ─── Status Enrichment ───────────────────────────────────

/**
 * Cross-reference sessions and tasks APIs to derive real agent status
 * when backend doesn't provide it. Mutates agents in place.
 */
export async function enrichAgentStatuses(agents: AgentWorker[]): Promise<void> {
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
        if (!session.idle) {
          aliveAgents.add(name);
        }
      }
    }

    for (const agent of agents) {
      if (agent.status !== 'idle') continue;
      if (busyAgents.has(agent.name)) {
        agent.status = 'busy';
      } else if (!aliveAgents.has(agent.name)) {
        agent.status = 'offline';
      }
    }
  } catch {
    // Enrichment is best-effort
  }
}

// ─── Status Normalization ────────────────────────────────

const STATUS_MAP: Record<string, AgentStatus> = {
  idle: 'idle',
  busy: 'busy',
  working: 'working',
  executing: 'executing',
  waiting: 'waiting',
  waiting_for_approval: 'waiting',
  awaiting: 'waiting',
  paused: 'paused',
  suspended: 'paused',
  error: 'error',
  errored: 'error',
  failed: 'error',
  crashed: 'error',
  offline: 'offline',
  stopped: 'offline',
  disconnected: 'offline',
  active: 'busy',
  running: 'executing',
  in_progress: 'working',
};

export function normalizeAgentStatus(raw: string): AgentStatus {
  return STATUS_MAP[raw.toLowerCase().trim()] ?? 'idle';
}

// ─── Display Helpers ─────────────────────────────────────

export function statusDotClass(status: string): string {
  switch (status) {
    case 'busy':
    case 'working':
      return 'bg-amber-400 animate-pulse';
    case 'executing':
      return 'bg-cyan-400 animate-pulse';
    case 'waiting':
      return 'bg-yellow-400 animate-pulse';
    case 'idle':
      return 'bg-emerald-400';
    case 'error':
      return 'bg-red-500';
    case 'offline':
      return 'bg-gray-600';
    case 'paused':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function budgetPercentage(agent: AgentWorker): number {
  if (agent.budget === 0) return 0;
  return Math.min(100, Math.round((agent.tokens_used / agent.budget) * 100));
}

export function budgetColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

// ─── OrgChart Utilities ──────────────────────────────────

export function updateNodeStatuses(nodes: OrgChartNode[], agentName: string, newStatus: AgentStatus): void {
  for (const node of nodes) {
    if (node.name === agentName) {
      node.status = newStatus;
      return;
    }
    if (node.reports.length > 0) {
      updateNodeStatuses(node.reports, agentName, newStatus);
    }
  }
}

// ─── Constants ───────────────────────────────────────────

export const AVAILABLE_TOOLS = [
  'Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob',
  'WebSearch', 'WebFetch', 'NotebookEdit', 'Agent',
];

export const AVAILABLE_PROVIDERS = ['claude_code', 'codex', 'cursor', 'gemini'];
