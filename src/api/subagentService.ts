import { get, put } from './http';

export interface SubagentPreset {
  name: string;
  description: string;
  default_model: string;
  readonly: boolean;
  level: number;
}

export interface SubagentConfig {
  name: string;
  enabled: boolean;
  model: string;
  description?: string;
  readonly?: boolean;
  tools?: string[];
  prompt?: string;
  isCustom?: boolean;
}

// Team presets — pre-configured bundles of subagents
export const TEAM_PRESETS: Record<string, { name: string; description: string; subagents: string[] }> = {
  'full-stack': {
    name: 'Full Stack Team',
    description: 'Complete development team with all specializations',
    subagents: ['architect', 'executor', 'reviewer', 'explorer', 'test-writer', 'debugger', 'docs-writer'],
  },
  'code-quality': {
    name: 'Code Quality',
    description: 'Focus on code quality, testing, and security',
    subagents: ['reviewer', 'test-writer', 'security-auditor', 'refactorer'],
  },
  'fast-dev': {
    name: 'Fast Development',
    description: 'Lean team for rapid feature development',
    subagents: ['executor', 'explorer', 'debugger'],
  },
  'planning': {
    name: 'Planning & Analysis',
    description: 'Strategic planning and requirements analysis',
    subagents: ['architect', 'planner', 'analyst'],
  },
  'frontend': {
    name: 'Frontend Focused',
    description: 'UI/UX development and design',
    subagents: ['designer', 'executor', 'reviewer', 'test-writer'],
  },
};

export const MODEL_OPTIONS = [
  { value: 'haiku', label: 'Haiku (fast, cheap)', color: 'text-emerald-400' },
  { value: 'sonnet', label: 'Sonnet (balanced)', color: 'text-blue-400' },
  { value: 'opus', label: 'Opus (powerful, expensive)', color: 'text-purple-400' },
];

export async function fetchPresets(): Promise<SubagentPreset[]> {
  try {
    const data = await get<{ presets: SubagentPreset[] }>('/subagent-presets');
    return data.presets || [];
  } catch {
    return [];
  }
}

export async function fetchAgentSubagents(agentName: string): Promise<string[]> {
  try {
    const data = await get<{ subagents: string[] }>(`/agents/${encodeURIComponent(agentName)}/subagents`);
    return data.subagents || [];
  } catch {
    return [];
  }
}

export async function updateAgentSubagents(agentName: string, subagents: string[]): Promise<void> {
  await put(`/agents/${encodeURIComponent(agentName)}/subagents`, { subagents });
}
