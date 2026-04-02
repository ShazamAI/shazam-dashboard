import { fetchTasks } from './taskService';
import { fetchAgents } from './companyService';
import { get } from './http';
import type { Task, AgentWorker, TaskFilter, PaginatedResult } from '@/types';

// Average cost per 1K tokens (blended input/output estimate per model)
// Source: Anthropic pricing as of 2026
const MODEL_COST_PER_1K: Record<string, number> = {
  'claude-opus-4-6': 0.030,        // $15 input + $75 output avg → ~$30/M blended
  'claude-sonnet-4-6': 0.0065,     // $3 input + $15 output avg → ~$6.5/M blended
  'claude-haiku-4-5-20251001': 0.002, // $0.80 input + $4 output avg → ~$2/M blended
};
const DEFAULT_COST_PER_1K = 0.0065; // Default to Sonnet pricing

export function getCostPer1K(model?: string | null): number {
  if (!model) return DEFAULT_COST_PER_1K;
  for (const [key, cost] of Object.entries(MODEL_COST_PER_1K)) {
    if (model.includes(key) || key.includes(model)) return cost;
  }
  if (model.includes('opus')) return MODEL_COST_PER_1K['claude-opus-4-6'] ?? DEFAULT_COST_PER_1K;
  if (model.includes('haiku')) return MODEL_COST_PER_1K['claude-haiku-4-5-20251001'] ?? DEFAULT_COST_PER_1K;
  return DEFAULT_COST_PER_1K;
}

// Keep backward-compatible constant for simple calculations
export const COST_PER_1K_TOKENS = DEFAULT_COST_PER_1K;

/** Load tasks with graceful fallback to empty result. */
export async function loadTasks(filter?: TaskFilter): Promise<PaginatedResult<Task>> {
  return fetchTasks(filter);
}

/** Load agents for a given company, returning empty array on failure. */
export async function loadAgents(companyName: string): Promise<AgentWorker[]> {
  try {
    const list = await fetchAgents(companyName);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// ─── Pure data transformation helpers ────────────────────

export interface TaskStats {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  successRate: number;
}

export function computeTaskStats(tasks: Task[]): TaskStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const failed = tasks.filter((t) => t.status === 'failed').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, failed, inProgress, pending, successRate };
}

export function computeTotalTokens(agents: AgentWorker[]): number {
  return agents.reduce((sum, a) => sum + a.tokens_used, 0);
}

export function computeTotalBudget(agents: AgentWorker[]): number {
  return agents.reduce((sum, a) => sum + a.budget, 0);
}

export function computeTotalCost(totalTokens: number, agents?: AgentWorker[]): number {
  if (agents && agents.length > 0) {
    // Per-agent cost calculation using their model
    return agents.reduce((sum, a) => {
      return sum + (a.tokens_used / 1000) * getCostPer1K(a.model);
    }, 0);
  }
  // Fallback: flat rate
  return (totalTokens / 1000) * DEFAULT_COST_PER_1K;
}

export function sortAgentsByUsage(agents: AgentWorker[]): AgentWorker[] {
  return [...agents].sort((a, b) => {
    const pctA = a.budget > 0 ? a.tokens_used / a.budget : 0;
    const pctB = b.budget > 0 ? b.tokens_used / b.budget : 0;
    return pctB - pctA;
  });
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatAgentCost(tokens: number, model?: string | null): string {
  const cost = (tokens / 1000) * getCostPer1K(model);
  return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`;
}

export function budgetPercentage(agent: AgentWorker): number {
  if (agent.budget <= 0) return 0;
  return Math.min(Math.round((agent.tokens_used / agent.budget) * 100), 100);
}

export function budgetBarColor(pct: number): string {
  if (pct < 50) return 'bg-emerald-500';
  if (pct < 80) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function budgetTextColor(pct: number): string {
  if (pct < 50) return 'text-emerald-400';
  if (pct < 80) return 'text-yellow-400';
  return 'text-red-400';
}

export function formatCost(cost: number): string {
  return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(2)}`;
}

// ─── Agent Performance Scores ─────────────────────────

export interface AgentScore {
  score: number;
  grade: string;
  completions: number;
  failures: number;
  success_rate: number;
  avg_duration_ms: number;
  total_tokens: number;
  cost_per_task: number;
  suggestion: string | null;
}

interface ScoresResponse {
  scores: Record<string, AgentScore>;
}

/**
 * Fetches performance scores for all agents from the /scores endpoint.
 */
export async function fetchAgentScores(): Promise<Record<string, AgentScore>> {
  try {
    const response = await get<ScoresResponse>('/scores');
    return response?.scores || {};
  } catch {
    return {};
  }
}

// ─── Context window metrics ───────────────────────────

export interface ContextEntry {
  agent: string;
  lastInput: number;
  lastOutput: number;
  peakInput: number;
  capacity: number;
  usagePercent: number;
  warning: boolean;
}

interface MetricsResponse {
  agents: Record<string, {
    context?: {
      last_input: number;
      last_output: number;
      peak_input: number;
      capacity: number;
      usage_percent: number;
      warning: boolean;
    };
    [key: string]: unknown;
  }>;
  totals: Record<string, unknown>;
}

/**
 * Fetches context window metrics for all agents from the /metrics endpoint.
 * Extracts the `context` field from each agent's metrics data.
 */
export async function fetchContextMetrics(): Promise<ContextEntry[]> {
  const response = await get<MetricsResponse>('/metrics');
  if (!response?.agents) return [];

  return Object.entries(response.agents)
    .filter(([, data]) => data.context && data.context.last_input > 0)
    .map(([agentName, data]) => {
      const ctx = data.context!;
      return {
        agent: agentName,
        lastInput: ctx.last_input,
        lastOutput: ctx.last_output,
        peakInput: ctx.peak_input,
        capacity: ctx.capacity,
        usagePercent: ctx.usage_percent,
        warning: ctx.warning,
      };
    });
}
