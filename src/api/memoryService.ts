import { get } from './http';
import { extractKey, ensureArray } from './utils';
import type { MemoryTreeNode, MemoryFileContent } from '@/types';

/**
 * Normalize raw backend tree nodes into well-typed MemoryTreeNode[].
 * Handles missing/malformed fields defensively — every node is guaranteed
 * to have name, path, type, and a children array.
 */
export function normalizeTreeNodes(nodes: unknown[]): MemoryTreeNode[] {
  return nodes.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      return { name: '(unknown)', path: '', type: 'file' as const, children: [] };
    }
    const node = raw as Record<string, unknown>;
    return {
      name: typeof node.name === 'string' ? node.name : '(unknown)',
      path: typeof node.path === 'string' ? node.path : '',
      type: node.type === 'directory' ? 'directory' as const : 'file' as const,
      children: Array.isArray(node.children) ? normalizeTreeNodes(node.children) : [],
    };
  });
}

/**
 * Fetch the full memory tree from the backend.
 * Returns [] on 404 or any network failure (endpoint may not exist).
 */
export async function fetchMemoryTree(): Promise<MemoryTreeNode[]> {
  try {
    const response = await get<unknown>('/context/tree');
    const raw = extractKey<unknown[]>(response, 'tree');
    const arr = ensureArray<unknown>(raw);
    return normalizeTreeNodes(arr);
  } catch {
    return [];
  }
}

/**
 * Fetch a single memory file's content + frontmatter.
 * Returns null on failure — caller should show an appropriate error state.
 */
export async function fetchMemoryFile(filePath: string): Promise<MemoryFileContent | null> {
  try {
    const response = await get<unknown>(`/context/file?path=${encodeURIComponent(filePath)}`);
    if (!response || typeof response !== 'object') return null;
    const raw = extractKey<Record<string, unknown>>(response, 'file');
    if (!raw || typeof raw !== 'object') return null;

    return {
      path: typeof raw.path === 'string' ? raw.path : filePath,
      content: typeof raw.content === 'string' ? raw.content : '',
      frontmatter: raw.frontmatter && typeof raw.frontmatter === 'object' && !Array.isArray(raw.frontmatter)
        ? raw.frontmatter as Record<string, string>
        : {},
    };
  } catch {
    return null;
  }
}
