import { ref, computed, readonly, type Ref } from 'vue';
import { fetchMemoryTree, fetchMemoryFile } from '@/api/memoryService';
import { normalizeError } from '@/api/utils';
import type { MemoryTreeNode, MemoryFileContent } from '@/types';

const MAX_DEPTH = 10;

/**
 * Composable for memory browser tree state, file loading, and expansion control.
 *
 * Encapsulates:
 * - Tree loading from backend
 * - Directory expand/collapse state
 * - Recursive directory path collection
 * - Selected file loading with error handling
 */
export function useMemoryTree() {
  // --- Tree State ---
  const tree = ref<MemoryTreeNode[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const expandedDirs = ref<Set<string>>(new Set());

  // --- File State ---
  const selectedFile = ref<MemoryFileContent | null>(null);
  const isLoadingFile = ref(false);
  const fileError = ref<string | null>(null);

  // --- Derived State ---
  const treeNodes = computed(() => tree.value);
  const hasContent = computed(() => tree.value.length > 0);
  const hasFrontmatter = computed(() =>
    selectedFile.value?.frontmatter
      ? Object.keys(selectedFile.value.frontmatter).length > 0
      : false,
  );

  /** Count total files across the entire tree. */
  const totalFiles = computed(() => countFilesInTree(tree.value));

  function countFilesInTree(nodes: MemoryTreeNode[]): number {
    let count = 0;
    for (const n of nodes) {
      if (n.type === 'file') count++;
      if (Array.isArray(n.children) && n.children.length > 0) {
        count += countFilesInTree(n.children);
      }
    }
    return count;
  }

  // --- Tree Traversal ---

  /** Recursively collect all directory paths from a tree, with depth guard. */
  function collectDirPaths(nodes: MemoryTreeNode[], depth = 0): string[] {
    if (depth >= MAX_DEPTH) return [];
    const paths: string[] = [];
    for (const node of nodes) {
      if (node.type === 'directory') {
        paths.push(node.path);
        if (Array.isArray(node.children) && node.children.length > 0) {
          paths.push(...collectDirPaths(node.children, depth + 1));
        }
      }
    }
    return paths;
  }

  // --- Actions ---

  /** Load the full memory tree from the backend. */
  async function loadTree(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      tree.value = await fetchMemoryTree();
      if (tree.value.length === 0) {
        // Empty tree is not an error, just no data
        error.value = null;
      }
    } catch (err) {
      error.value = normalizeError(err, 'Failed to load memory tree');
      tree.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  /** Toggle a single directory's expanded state. */
  function toggleDir(path: string): void {
    const next = new Set(expandedDirs.value);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    expandedDirs.value = next;
  }

  /** Expand all directories in the tree. */
  function expandAll(): void {
    expandedDirs.value = new Set(collectDirPaths(tree.value));
  }

  /** Collapse all directories. */
  function collapseAll(): void {
    expandedDirs.value = new Set();
  }

  /** Load a memory file by path. */
  async function selectFile(path: string): Promise<void> {
    isLoadingFile.value = true;
    fileError.value = null;
    try {
      const result = await fetchMemoryFile(path);
      if (result) {
        selectedFile.value = result;
      } else {
        fileError.value = 'Could not load file content';
      }
    } catch (err) {
      fileError.value = normalizeError(err, 'Failed to load file');
    } finally {
      isLoadingFile.value = false;
    }
  }

  return {
    // Tree
    treeNodes,
    isLoading: readonly(isLoading),
    error: readonly(error),
    expandedDirs: expandedDirs as Ref<Set<string>>,
    hasContent,
    totalFiles,

    // File
    selectedFile: readonly(selectedFile),
    isLoadingFile: readonly(isLoadingFile),
    fileError: readonly(fileError),
    hasFrontmatter,

    // Actions
    loadTree,
    toggleDir,
    expandAll,
    collapseAll,
    selectFile,
  };
}
