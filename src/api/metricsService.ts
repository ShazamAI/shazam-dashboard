import { fetchTasks } from './taskService';
import { fetchAgents } from './companyService';
import type { Task, AgentWorker, TaskFilter, PaginatedResult } from '@/types';

export const COST_PER_1K_TOKENS = 0.003;

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

export function computeTotalCost(totalTokens: number): number {
  return (totalTokens / 1000) * COST_PER_1K_TOKENS;
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

export function formatAgentCost(tokens: number): string {
  const cost = (tokens / 1000) * COST_PER_1K_TOKENS;
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
