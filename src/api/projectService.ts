import { get, post, del } from './http';
import type { Project } from '@/types';

export async function fetchProjects(): Promise<Project[]> {
  const data = await get<{ projects: Project[] }>('/projects');
  return data.projects || [];
}

export async function addProject(path: string): Promise<void> {
  await post('/projects', { path });
}

export async function startProject(name: string): Promise<void> {
  await post(`/projects/${encodeURIComponent(name)}/start`);
}

export async function stopProject(name: string): Promise<void> {
  await post(`/projects/${encodeURIComponent(name)}/stop`);
}

export async function removeProject(name: string): Promise<void> {
  await del(`/projects/${encodeURIComponent(name)}`);
}

export interface SyncResult {
  files: Array<{ path: string; content: string; type: string }>;
  count: number;
  providers: string[];
}

export async function syncProject(company: string, preview?: boolean): Promise<SyncResult> {
  const response = await post<SyncResult>('/sync', { company, preview });
  return response;
}

export async function getSyncStatus(): Promise<{ synced: boolean; last_sync?: string; files?: string[] }> {
  const response = await get<{ synced: boolean; last_sync?: string; files?: string[] }>('/sync/status');
  return response;
}
