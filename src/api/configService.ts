import { get, put, post } from './http';
import { extractKey, ensureArray } from './utils';
import type {
  ShazamConfig,
  RalphLoopConfig,
  PluginConfig,
  WorkspaceInfo,
  SessionPoolInfo,
  AgentYamlConfig,
} from '@/types';

/** Default RalphLoop config values */
function defaultRalphLoopConfig(): RalphLoopConfig {
  return {
    auto_approve: false,
    auto_retry: true,
    max_concurrent: 4,
    max_retries: 2,
    poll_interval: 5000,
    module_lock: true,
    peer_reassign: true,
    qa_auto: true,
    context_history: 5,
    team_activity: 10,
    context_budget: 4000,
  };
}

/**
 * Build a fallback ShazamConfig from /api/companies data when /api/config is unavailable.
 */
async function buildFallbackConfig(): Promise<ShazamConfig | null> {
  try {
    const companiesResponse = await get<unknown>('/companies');
    const companies = ensureArray<Record<string, unknown>>(
      extractKey<unknown[]>(companiesResponse, 'companies')
    );

    // Find the active company
    const activeCompany = companies.find((c) => c.active === true) ?? companies[0];
    if (!activeCompany) return null;

    const companyName = typeof activeCompany.name === 'string' ? activeCompany.name : 'Unknown';

    // Try to fetch agents for the active company
    let agentsMap: Record<string, AgentYamlConfig> = {};
    try {
      const agentsResponse = await get<unknown>(
        `/companies/${encodeURIComponent(companyName)}/agents`
      );
      const agents = ensureArray<Record<string, unknown>>(
        extractKey<unknown[]>(agentsResponse, 'agents')
      );
      for (const a of agents) {
        const name = typeof a.name === 'string' ? a.name : 'unknown';
        agentsMap[name] = {
          role: typeof a.role === 'string' ? a.role : 'unknown',
          supervisor: typeof a.supervisor === 'string' ? a.supervisor : null,
          budget: typeof a.budget === 'number' ? a.budget : 0,
          model: typeof a.model === 'string' ? a.model : null,
          fallback_model: typeof a.fallback_model === 'string' ? a.fallback_model : null,
          provider: typeof a.provider === 'string' ? a.provider : null,
          tools: ensureArray<string>(a.tools),
          skills: ensureArray<string>(a.skills),
          modules: ensureArray<unknown>(a.modules).map((m) =>
            typeof m === 'string' ? m : String(m)
          ),
          domain: typeof a.domain === 'string' ? a.domain : null,
          workspace: typeof a.workspace === 'string' ? a.workspace : null,
          system_prompt: typeof a.system_prompt === 'string' ? a.system_prompt : null,
          heartbeat_interval: typeof a.heartbeat_interval === 'number' ? a.heartbeat_interval : 60000,
        };
      }
    } catch {
      // Agents endpoint may also be unavailable
    }

    return {
      provider: 'claude_code',
      company: {
        name: companyName,
        mission: typeof activeCompany.mission === 'string' ? activeCompany.mission : null,
        workspace: typeof activeCompany.workspace === 'string' ? activeCompany.workspace : null,
      },
      domains: {},
      workspaces: {},
      tech_stack: {},
      agents: agentsMap,
      config: defaultRalphLoopConfig(),
      plugins: [],
    };
  } catch {
    return null;
  }
}

export async function fetchConfig(): Promise<ShazamConfig | null> {
  try {
    const response = await get<unknown>('/config');
    if (!response || typeof response !== 'object') {
      return buildFallbackConfig();
    }

    const obj = response as Record<string, unknown>;

    // Backend may wrap in { "config": {...} }, { "data": {...} }, or return flat
    const inner = (
      (obj.config && typeof obj.config === 'object' ? obj.config : null) ??
      (obj.data && typeof obj.data === 'object' ? obj.data : null) ??
      response
    ) as Record<string, unknown>;

    // Validate it looks like a ShazamConfig before returning
    if ('provider' in inner || 'company' in inner || 'domains' in inner || 'config' in inner) {
      return inner as unknown as ShazamConfig;
    }

    return response as ShazamConfig;
  } catch {
    // /api/config returned 404 or error — build config from available endpoints
    return buildFallbackConfig();
  }
}

export async function updateRalphLoopConfig(config: Partial<RalphLoopConfig>): Promise<RalphLoopConfig> {
  return put<RalphLoopConfig>('/config/ralph-loop', config);
}

export async function reloadPlugins(): Promise<PluginConfig[]> {
  const response = await post<unknown>('/plugins/reload');
  const raw = extractKey<PluginConfig[]>(response, 'plugins');
  return ensureArray<PluginConfig>(raw);
}

/**
 * Backend returns: { "workspaces": [] }
 * Mock API returns: { "data": [] }
 */
export async function fetchWorkspaces(): Promise<WorkspaceInfo[]> {
  const response = await get<unknown>('/workspaces');
  const raw = extractKey<WorkspaceInfo[]>(response, 'workspaces');
  return ensureArray<WorkspaceInfo>(raw);
}

export async function switchWorkspace(name: string): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/workspaces/switch', { name });
}

// Memory API functions extracted to memoryService — re-export for backward compatibility
export { fetchMemoryTree, fetchMemoryFile } from './memoryService';

/**
 * Backend returns: { "sessions": [{ agent, alive, last_used, task_count }] }
 * Frontend expects: SessionPoolInfo { active_sessions, sessions: Record<string, {...}> }
 */
interface BackendSession {
  agent: string;
  alive: boolean;
  last_used: string;
  task_count: number;
}

export async function fetchSessionPool(): Promise<SessionPoolInfo | null> {
  try {
    const response = await get<unknown>('/sessions');
    const raw = extractKey<BackendSession[]>(response, 'sessions');
    const sessions = ensureArray<BackendSession>(raw);

    // Map backend array format to frontend Record format
    const sessionMap: SessionPoolInfo['sessions'] = {};
    let activeCount = 0;

    for (const s of sessions) {
      sessionMap[s.agent] = {
        agent_name: s.agent,
        task_count: s.task_count,
        last_used: s.last_used,
        idle: !s.alive,
      };
      if (s.alive) activeCount++;
    }

    return {
      active_sessions: activeCount,
      sessions: sessionMap,
    };
  } catch (err) {
    // Re-throw so callers can display meaningful error messages
    throw err instanceof Error ? err : new Error('Failed to load session pool');
  }
}
