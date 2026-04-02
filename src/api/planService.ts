import { get, post, put, del } from './http';
import { extractKey } from './utils';
import type { Plan } from '@/types';

export async function fetchPlans(): Promise<Plan[]> {
  try {
    const response = await get<unknown>('/plans');
    return extractKey<Plan[]>(response, 'plans') ?? [];
  } catch (err) {
    throw new Error(`Failed to fetch plans: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function fetchPlan(planId: string): Promise<Plan | null> {
  try {
    const response = await get<unknown>(`/plans/${encodeURIComponent(planId)}`);
    return extractKey<Plan>(response, 'plan') ?? null;
  } catch (err) {
    throw new Error(`Failed to fetch plan ${planId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function createPlan(description: string, company: string): Promise<{ plan_id: string }> {
  try {
    const response = await post<unknown>('/plans', { description, company });
    return response as { plan_id: string };
  } catch (err) {
    throw new Error(`Failed to create plan: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function updatePlan(planId: string, updates: Partial<Plan>): Promise<Plan> {
  try {
    const response = await put<unknown>(`/plans/${encodeURIComponent(planId)}`, updates);
    return extractKey<Plan>(response, 'plan');
  } catch (err) {
    throw new Error(`Failed to update plan ${planId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function approvePlan(planId: string, company: string): Promise<{ tasks_created: number }> {
  try {
    const response = await post<unknown>(`/plans/${encodeURIComponent(planId)}/approve`, { company });
    return response as { tasks_created: number };
  } catch (err) {
    throw new Error(`Failed to approve plan ${planId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function refinePlan(planId: string, company: string, feedback: string): Promise<{ task_id: string }> {
  try {
    const response = await post<unknown>(`/plans/${encodeURIComponent(planId)}/refine`, { company, feedback });
    return response as { task_id: string };
  } catch (err) {
    throw new Error(`Failed to refine plan ${planId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function deletePlan(planId: string): Promise<void> {
  try {
    await del<unknown>(`/plans/${encodeURIComponent(planId)}`);
  } catch (err) {
    throw new Error(`Failed to delete plan ${planId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
