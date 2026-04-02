import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { get, put } from '@/api/http';
import { normalizeError } from '@/api/utils';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { LANGUAGE_MAP, FILE_ICON_MAP } from '@/constants/languages';

// --- Types ---
export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  children?: TreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  extension: string;
}

interface FileTreeResponse {
  tree: TreeNode[];
  path: string;
  workspace: string;
}

export interface FlatNode {
  node: TreeNode;
  depth: number;
}

export function useFileBrowser() {
  const { activeCompany } = useActiveCompany();

  const tree = ref<TreeNode[]>([]);
  const selectedFile = ref<FileContent | null>(null);
  const expandedDirs = ref<Set<string>>(new Set());
  const isLoading = ref(false);
  const isLoadingFile = ref(false);
  const isSaving = ref(false);
  const error = ref<string | null>(null);
  const saveMessage = ref<string | null>(null);
  const editorContent = ref('');
  const isEditing = ref(false);
  const currentPath = ref('');

  // --- Computed ---

  const breadcrumbs = computed(() => {
    if (!currentPath.value) return [{ label: 'Root', path: '' }];
    const parts = currentPath.value.split('/').filter(Boolean);
    const crumbs = [{ label: 'Root', path: '' }];
    let accumulated = '';
    for (const part of parts) {
      accumulated += (accumulated ? '/' : '') + part;
      crumbs.push({ label: part, path: accumulated });
    }
    return crumbs;
  });

  const languageLabel = computed(() => {
    const ext = selectedFile.value?.extension || '';
    return LANGUAGE_MAP[ext] || 'Plain Text';
  });

  const languageClass = computed(() => {
    const ext = selectedFile.value?.extension || '';
    const map: Record<string, string> = {
      '.ts': 'language-typescript', '.tsx': 'language-typescript',
      '.js': 'language-javascript', '.jsx': 'language-javascript',
      '.vue': 'language-html', '.html': 'language-html', '.css': 'language-css',
      '.json': 'language-json', '.py': 'language-python', '.rs': 'language-rust',
      '.sh': 'language-bash', '.sql': 'language-sql', '.yaml': 'language-yaml',
      '.yml': 'language-yaml', '.md': 'language-markdown', '.xml': 'language-xml',
    };
    return map[ext] || '';
  });

  const fileSize = computed(() => {
    const size = selectedFile.value?.size || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1048576).toFixed(1)} MB`;
  });

  const hasUnsavedChanges = computed(
    () => isEditing.value && editorContent.value !== selectedFile.value?.content
  );

  // --- Unsaved changes warning ---

  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (hasUnsavedChanges.value) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload);
    loadTree();
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', onBeforeUnload);
  });

  // --- Flattened tree for rendering ---

  const flatTree = computed<FlatNode[]>(() => {
    const result: FlatNode[] = [];
    function walk(nodes: TreeNode[], depth: number) {
      const sorted = [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const node of sorted) {
        result.push({ node, depth });
        if (node.type === 'directory' && expandedDirs.value.has(node.path)) {
          walk(node.children || [], depth + 1);
        }
      }
    }
    walk(tree.value, 0);
    return result;
  });

  // --- Actions ---

  async function loadTree(path = '') {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams({ depth: '3' });
      if (path) params.set('path', path);
      const result = await get<FileTreeResponse>(`/files/tree?${params}`);
      tree.value = result.tree || [];
      currentPath.value = result.path || path;
      if (tree.value.length === 0) {
        error.value = 'No files found. Ensure a workspace is configured.';
      }
    } catch (e) {
      error.value = normalizeError(e, 'Failed to load file tree');
    } finally {
      isLoading.value = false;
    }
  }

  async function selectFile(path: string) {
    isLoadingFile.value = true;
    saveMessage.value = null;
    try {
      const result = await get<FileContent>(`/files?path=${encodeURIComponent(path)}`);
      selectedFile.value = result;
      editorContent.value = result.content;
      isEditing.value = false;
    } catch (e) {
      error.value = normalizeError(e, 'Failed to load file');
    } finally {
      isLoadingFile.value = false;
    }
  }

  async function handleSave() {
    if (!selectedFile.value) return;
    isSaving.value = true;
    saveMessage.value = null;
    const previousContent = editorContent.value;
    try {
      await put<{ ok: boolean }>('/files', {
        path: selectedFile.value.path,
        content: editorContent.value,
      });
      selectedFile.value = { ...selectedFile.value, content: editorContent.value };
      saveMessage.value = 'Saved successfully';
      setTimeout(() => { saveMessage.value = null; }, 2500);
    } catch (e) {
      // Rollback editor content to last saved version on error
      editorContent.value = selectedFile.value?.content ?? previousContent;
      saveMessage.value = `Save failed: ${normalizeError(e, 'Unknown error')}`;
    } finally {
      isSaving.value = false;
    }
  }

  function toggleDir(node: TreeNode) {
    const next = new Set(expandedDirs.value);
    if (next.has(node.path)) {
      next.delete(node.path);
    } else {
      next.add(node.path);
    }
    expandedDirs.value = next;
  }

  function navigateBreadcrumb(path: string) {
    selectedFile.value = null;
    expandedDirs.value = new Set();
    loadTree(path);
  }

  function iconFor(node: TreeNode): string {
    if (node.type === 'directory') {
      return expandedDirs.value.has(node.path) ? 'folder-open' : 'folder';
    }
    const ext = node.extension || '';
    return FILE_ICON_MAP[ext] || 'file';
  }

  function iconColor(icon: string): string {
    const map: Record<string, string> = {
      'folder': 'text-shazam-400', 'folder-open': 'text-shazam-400',
      'ts': 'text-blue-400', 'js': 'text-yellow-400', 'vue': 'text-emerald-400',
      'html': 'text-orange-400', 'css': 'text-purple-400', 'json': 'text-yellow-300',
      'py': 'text-sky-400', 'rs': 'text-orange-500', 'ex': 'text-purple-300',
      'md': 'text-gray-400', 'yaml': 'text-red-400', 'sh': 'text-green-400',
    };
    return map[icon] || 'text-gray-500';
  }

  // --- Lifecycle ---

  watch(() => activeCompany.value?.name, (n, o) => {
    if (n && n !== o) {
      selectedFile.value = null;
      expandedDirs.value = new Set();
      editorContent.value = '';
      isEditing.value = false;
      saveMessage.value = null;
      loadTree();
    }
  });

  return {
    // State
    tree,
    selectedFile,
    expandedDirs,
    isLoading,
    isLoadingFile,
    isSaving,
    error,
    saveMessage,
    editorContent,
    isEditing,
    currentPath,

    // Computed
    breadcrumbs,
    languageLabel,
    languageClass,
    fileSize,
    hasUnsavedChanges,
    flatTree,

    // Actions
    loadTree,
    selectFile,
    handleSave,
    toggleDir,
    navigateBreadcrumb,
    iconFor,
    iconColor,
  };
}
