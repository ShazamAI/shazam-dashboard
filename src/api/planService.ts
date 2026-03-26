import { get, post, put, del } from './http';
import type { Plan } from '@/types';

export async function fetchPlans(): Promise<Plan[]> {
  const response = await get<unknown>('/plans');
  if (response && typeof response === 'object' && 'plans' in (response as Record<string, unknown>)) {
    return (response as { plans: Plan[] }).plans;
  }
  return [];
}

export async function fetchPlan(planId: string): Promise<Plan | null> {
  const response = await get<unknown>(`/plans/${encodeURIComponent(planId)}`);
  if (response && typeof response === 'object' && 'plan' in (response as Record<string, unknown>)) {
    return (response as { plan: Plan }).plan;
  }
  return null;
}

export async function createPlan(description: string, company: string): Promise<{ plan_id: string; task_id: string }> {
  const response = await post<unknown>('/plans', { description, company });
  return response as { plan_id: string; task_id: string };
}

export async function updatePlan(planId: string, updates: Partial<Plan>): Promise<Plan> {
  const response = await put<unknown>(`/plans/${encodeURIComponent(planId)}`, updates);
  return (response as { plan: Plan }).plan;
}

export async function approvePlan(planId: string, company: string): Promise<{ tasks_created: number }> {
  const response = await post<unknown>(`/plans/${encodeURIComponent(planId)}/approve`, { company });
  return response as { tasks_created: number };
}

export async function refinePlan(planId: string, company: string, feedback: string): Promise<{ task_id: string }> {
  const response = await post<unknown>(`/plans/${encodeURIComponent(planId)}/refine`, { company, feedback });
  return response as { task_id: string };
}

export async function deletePlan(planId: string): Promise<void> {
  await del<unknown>(`/plans/${encodeURIComponent(planId)}`);
}
