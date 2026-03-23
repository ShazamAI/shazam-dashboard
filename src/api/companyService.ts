import { get, post, put } from './http';
import { extractKey, ensureArray } from './utils';
import type { Company, AgentWorker, OrgChartNode, CreateAgentPayload } from '@/types';

/**
 * Backend returns: { "companies": [{ name, active, workspace }] }
 * Frontend expects: Company[] with { name, mission, domain, agents, task_count, status }
 */
interface BackendCompany {
  name: string;
  active: boolean;
  workspace: string | null;
  mission?: string | null;
  domain?: Record<string, unknown>;
  agents?: unknown[];
  task_count?: number;
  status?: string;
}

function mapCompany(raw: BackendCompany): Company {
  return {
    name: raw.name,
    mission: raw.mission ?? null,
    domain: raw.domain ?? {},
    agents: ensureArray(raw.agents).map(mapAgent),
    task_count: raw.task_count ?? 0,
    status: raw.status ?? (raw.active ? 'active' : 'inactive'),
  };
}

/**
 * Backend returns: { "agents": [{ name, role, budget, domain, supervisor, ... }] }
 * Missing from backend: status, tokens_used, provider, company_ref, context, task_history
 */
interface BackendAgent {
  name: string;
  role: string;
  supervisor?: string | null;
  domain?: string | null;
  system_prompt?: string | null;
  model?: string | null;
  fallback_model?: string | null;
  provider?: string | null;
  tools?: string[];
  skills?: string[];
  modules?: unknown[];
  budget?: number;
  tokens_used?: number;
  heartbeat_interval?: number;
  status?: string;
  context?: Record<string, unknown>;
  task_history?: string[];
  company_ref?: string | null;
}

/**
 * Normalize backend status strings into canonical AgentStatus values.
 * Backend may not send status at all, or use various naming conventions.
 */
function normalizeAgentStatus(raw: string | undefined | null): AgentWorker['status'] {
  if (!raw) return 'idle';
  const s = raw.toLowerCase().trim();
  const map: Record<string, AgentWorker['status']> = {
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
  return map[s] ?? 'idle';
}

function mapAgent(raw: unknown): AgentWorker {
  const a = raw as BackendAgent;
  return {
    name: a.name ?? 'unknown',
    role: a.role ?? 'unknown',
    supervisor: a.supervisor ?? null,
    domain: a.domain ?? null,
    system_prompt: a.system_prompt ?? null,
    model: a.model ?? null,
    fallback_model: a.fallback_model ?? null,
    provider: a.provider ?? null,
    tools: ensureArray<string>(a.tools),
    skills: ensureArray<string>(a.skills),
    modules: ensureArray(a.modules).map((m) => {
      if (typeof m === 'string') return m;
      if (m && typeof m === 'object' && 'name' in m) return (m as { name: string }).name;
      return String(m);
    }),
    budget: a.budget ?? 0,
    tokens_used: a.tokens_used ?? 0,
    heartbeat_interval: a.heartbeat_interval ?? 60000,
    status: normalizeAgentStatus(a.status),
    context: a.context ?? {},
    task_history: ensureArray<string>(a.task_history),
    company_ref: a.company_ref ?? null,
  };
}

/**
 * Backend returns: { "org_chart": [{ name, role, budget, subordinates: [...] }] }
 * Frontend expects: OrgChartNode[] with "reports" instead of "subordinates"
 */
interface BackendOrgNode {
  name: string;
  role: string;
  status?: string;
  supervisor?: string | null;
  domain?: string | null;
  budget?: number;
  modules?: unknown[];
  subordinates?: BackendOrgNode[];
  reports?: BackendOrgNode[];
}

function mapOrgNode(raw: BackendOrgNode): OrgChartNode {
  const children = raw.subordinates ?? raw.reports ?? [];
  return {
    name: raw.name,
    role: raw.role,
    status: (raw.status as OrgChartNode['status']) ?? 'idle',
    supervisor: raw.supervisor ?? null,
    domain: raw.domain ?? null,
    reports: ensureArray<BackendOrgNode>(children).map(mapOrgNode),
  };
}

export async function fetchCompanies(): Promise<Company[]> {
  const response = await get<unknown>('/companies');
  const raw = extractKey<BackendCompany[]>(response, 'companies');
  return ensureArray<BackendCompany>(raw).map(mapCompany);
}

export async function createCompany(payload: { name: string; config_path?: string }): Promise<Company> {
  const response = await post<unknown>('/companies', payload);
  const raw = extractKey<BackendCompany>(response, 'company');
  return mapCompany(raw);
}

export async function fetchAgents(companyName: string): Promise<AgentWorker[]> {
  const response = await get<unknown>(`/companies/${encodeURIComponent(companyName)}/agents`);
  const raw = extractKey<unknown[]>(response, 'agents');
  return ensureArray(raw).map(mapAgent);
}

export async function updateAgents(
  companyName: string,
  agents: Partial<AgentWorker>[]
): Promise<AgentWorker[]> {
  const response = await put<unknown>(
    `/companies/${encodeURIComponent(companyName)}/agents`,
    { agents }
  );
  const raw = extractKey<unknown[]>(response, 'agents');
  return ensureArray(raw).map(mapAgent);
}

export async function createAgent(
  companyName: string,
  agent: CreateAgentPayload
): Promise<AgentWorker> {
  const response = await post<unknown>(`/companies/${encodeURIComponent(companyName)}/agents`, agent);
  const raw = extractKey<unknown>(response, 'agent');
  return mapAgent(raw);
}

export async function fetchOrgChart(companyName: string): Promise<OrgChartNode[]> {
  const response = await get<unknown>(`/companies/${encodeURIComponent(companyName)}/org-chart`);
  const raw = extractKey<BackendOrgNode[]>(response, 'org_chart');
  return ensureArray<BackendOrgNode>(raw).map(mapOrgNode);
}
