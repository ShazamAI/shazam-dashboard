import { get, post, del } from './http';
import { extractKey, ensureArray } from './utils';
import type { Task, TaskFilter, CreateTaskPayload, PaginatedResult, Workflow, PipelineStage } from '@/types';

/**
 * Backend returns: { "tasks": [{ id, status, title, description, ... }] }
 * Backend task shape matches frontend Task type closely, but some fields
 * may be missing — provide defaults.
 */
interface BackendTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  assigned_to?: string | null;
  created_by?: string | null;
  parent_task_id?: string | null;
  depends_on?: string | null;
  company?: string | null;
  result?: unknown;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Pipeline fields
  workflow?: string | null;
  pipeline?: PipelineStage[] | null;
  current_stage?: number | null;
  required_role?: string | null;
}

function mapTask(raw: BackendTask): Task {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    status: raw.status as Task['status'],
    assigned_to: raw.assigned_to ?? null,
    created_by: raw.created_by ?? null,
    parent_task_id: raw.parent_task_id ?? null,
    depends_on: raw.depends_on ?? null,
    company: raw.company ?? null,
    result: raw.result ?? null,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    // Pipeline fields
    workflow: raw.workflow ?? null,
    pipeline: raw.pipeline ?? null,
    current_stage: raw.current_stage ?? null,
    required_role: raw.required_role ?? null,
  };
}

/**
 * Fetch tasks with optional pagination and filters.
 *
 * When `page` and `page_size` are provided, sends them to the backend.
 * The backend may respond with:
 *   - Paginated: { tasks: [], total: N, page: N, page_size: N, total_pages: N }
 *   - Flat array: { tasks: [] } or [ ... ]
 *
 * Returns a PaginatedResult regardless — if backend doesn't paginate,
 * we compute pagination metadata from the full array.
 */
export async function fetchTasks(filters?: TaskFilter): Promise<PaginatedResult<Task>> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.assigned_to) params.set('assigned_to', filters.assigned_to);
  if (filters?.company) params.set('company', filters.company);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.page_size) params.set('page_size', String(filters.page_size));

  const query = params.toString();
  const path = query ? `/tasks?${query}` : '/tasks';
  const response = await get<unknown>(path);

  const obj = (response && typeof response === 'object' && !Array.isArray(response))
    ? response as Record<string, unknown>
    : null;

  const raw = extractKey<BackendTask[]>(response, 'tasks');
  const items = ensureArray<BackendTask>(raw).map(mapTask);

  // Extract pagination metadata from response (backend may include it)
  const reqPage = filters?.page ?? 1;
  const reqPageSize = filters?.page_size ?? (items.length || 20);
  const total = typeof obj?.total === 'number' ? obj.total : items.length;
  const totalPages = typeof obj?.total_pages === 'number'
    ? obj.total_pages
    : Math.max(1, Math.ceil(total / reqPageSize));

  return {
    items,
    total,
    page: typeof obj?.page === 'number' ? obj.page : reqPage,
    page_size: reqPageSize,
    total_pages: totalPages,
  };
}

export async function createTask(
  companyName: string,
  payload: CreateTaskPayload
): Promise<Task> {
  const response = await post<unknown>(`/companies/${encodeURIComponent(companyName)}/tasks`, payload);
  const raw = extractKey<BackendTask>(response, 'task');
  return mapTask(raw);
}

export async function approveTask(taskId: string): Promise<Task> {
  const response = await post<unknown>(`/tasks/${encodeURIComponent(taskId)}/approve`);
  const raw = extractKey<BackendTask>(response, 'task');
  return mapTask(raw);
}

export async function rejectTask(taskId: string): Promise<Task> {
  const response = await post<unknown>(`/tasks/${encodeURIComponent(taskId)}/reject`);
  const raw = extractKey<BackendTask>(response, 'task');
  return mapTask(raw);
}

export async function pauseTask(taskId: string): Promise<Task> {
  const response = await post<unknown>(`/tasks/${encodeURIComponent(taskId)}/pause`);
  const raw = extractKey<BackendTask>(response, 'task');
  return mapTask(raw);
}

export async function resumeTask(taskId: string): Promise<Task> {
  const response = await post<unknown>(`/tasks/${encodeURIComponent(taskId)}/resume`);
  const raw = extractKey<BackendTask>(response, 'task');
  return mapTask(raw);
}

export async function retryTask(taskId: string): Promise<Task> {
  const response = await post<unknown>(`/tasks/${encodeURIComponent(taskId)}/retry`);
  const raw = extractKey<BackendTask>(response, 'task');
  return mapTask(raw);
}

export async function deleteTask(taskId: string): Promise<void> {
  await del<unknown>(`/tasks/${encodeURIComponent(taskId)}`);
}

export async function approveAllTasks(): Promise<{ approved: number }> {
  const response = await post<unknown>('/tasks/approve-all');
  if (response && typeof response === 'object' && 'approved' in (response as Record<string, unknown>)) {
    return response as { approved: number };
  }
  return { approved: 0 };
}

// --- Pipeline Stage Actions ---

export async function approveStage(taskId: string, approvedBy?: string): Promise<Task> {
  const response = await post<unknown>(`/tasks/${encodeURIComponent(taskId)}/approve-stage`, {
    approved_by: approvedBy ?? 'user',
  });
  const raw = extractKey<BackendTask>(response, 'task');
  return mapTask(raw);
}

export async function rejectStage(taskId: string, reason: string, rejectedBy?: string): Promise<Task> {
  const response = await post<unknown>(`/tasks/${encodeURIComponent(taskId)}/reject-stage`, {
    reason,
    rejected_by: rejectedBy ?? 'user',
  });
  const raw = extractKey<BackendTask>(response, 'task');
  return mapTask(raw);
}

// --- Workflow API ---

export async function fetchWorkflows(): Promise<Workflow[]> {
  const response = await get<unknown>('/workflows');
  if (response && typeof response === 'object' && 'workflows' in (response as Record<string, unknown>)) {
    return (response as { workflows: Workflow[] }).workflows;
  }
  return [];
}

export async function fetchWorkflow(name: string): Promise<Workflow | null> {
  const response = await get<unknown>(`/workflows/${encodeURIComponent(name)}`);
  if (response && typeof response === 'object' && 'workflow' in (response as Record<string, unknown>)) {
    return (response as { workflow: Workflow }).workflow;
  }
  return null;
}

export async function saveWorkflow(workflow: Workflow): Promise<void> {
  await put<unknown>(`/workflows/${encodeURIComponent(workflow.name)}`, {
    stages: workflow.stages,
  });
}

export async function createWorkflow(workflow: Workflow): Promise<void> {
  await post<unknown>('/workflows', {
    name: workflow.name,
    stages: workflow.stages,
  });
}

export async function deleteWorkflow(name: string): Promise<void> {
  await del<unknown>(`/workflows/${encodeURIComponent(name)}`);
}
