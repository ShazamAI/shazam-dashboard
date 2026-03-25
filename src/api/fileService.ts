import { get, put } from './http';

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  children: FileTreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  extension: string;
}

export async function fetchFileTree(path = '', depth = 3): Promise<FileTreeNode[]> {
  const params = new URLSearchParams();
  if (path) params.set('path', path);
  params.set('depth', String(depth));

  const response = await get<{ tree: FileTreeNode[] }>(`/files/tree?${params}`);
  return response?.tree ?? [];
}

export async function fetchFileContent(path: string): Promise<FileContent | null> {
  try {
    return await get<FileContent>(`/files?path=${encodeURIComponent(path)}`);
  } catch {
    return null;
  }
}

export async function saveFileContent(path: string, content: string): Promise<boolean> {
  try {
    await put('/files', { path, content });
    return true;
  } catch {
    return false;
  }
}
