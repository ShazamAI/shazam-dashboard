<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { get, put } from '@/api/http';
import { useActiveCompany } from '@/composables/useActiveCompany';
import AppButton from '@/components/common/Button.vue';

// ─── Types ───────────────────────────────────────────────
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  children?: TreeNode[];
}

interface FileContent {
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

// ─── State ───────────────────────────────────────────────
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

// ─── Computed ────────────────────────────────────────────
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
  const map: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript',
    '.vue': 'Vue', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
    '.ex': 'Elixir', '.exs': 'Elixir', '.rs': 'Rust', '.py': 'Python',
    '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.md': 'Markdown',
    '.sh': 'Shell', '.sql': 'SQL', '.toml': 'TOML', '.xml': 'XML',
    '.go': 'Go', '.rb': 'Ruby', '.java': 'Java', '.kt': 'Kotlin',
  };
  return map[ext] || 'Plain Text';
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

// ─── Flattened tree for rendering ─────────────────────────
interface FlatNode { node: TreeNode; depth: number }
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

// ─── Actions ─────────────────────────────────────────────
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
    error.value = e instanceof Error ? e.message : 'Failed to load file tree';
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
    error.value = e instanceof Error ? e.message : 'Failed to load file';
  } finally {
    isLoadingFile.value = false;
  }
}

async function handleSave() {
  if (!selectedFile.value) return;
  isSaving.value = true;
  saveMessage.value = null;
  try {
    await put<{ ok: boolean }>('/files', {
      path: selectedFile.value.path,
      content: editorContent.value,
    });
    selectedFile.value = { ...selectedFile.value, content: editorContent.value };
    saveMessage.value = 'Saved successfully';
    setTimeout(() => { saveMessage.value = null; }, 2500);
  } catch (e) {
    saveMessage.value = `Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
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
  const map: Record<string, string> = {
    '.ts': 'ts', '.tsx': 'ts', '.js': 'js', '.jsx': 'js',
    '.vue': 'vue', '.html': 'html', '.css': 'css', '.json': 'json',
    '.py': 'py', '.rs': 'rs', '.ex': 'ex', '.md': 'md',
    '.yaml': 'yaml', '.yml': 'yaml', '.sh': 'sh',
  };
  return map[ext] || 'file';
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

// ─── Lifecycle ──────────────────────────────────────────
watch(() => activeCompany.value?.name, (n, o) => {
  if (n && n !== o) {
    selectedFile.value = null;
    expandedDirs.value = new Set();
    loadTree();
  }
});

onMounted(() => loadTree());
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 px-1 text-xs">
      <button
        v-for="(crumb, i) in breadcrumbs"
        :key="crumb.path"
        class="flex items-center gap-1.5"
        @click="navigateBreadcrumb(crumb.path)"
      >
        <span
          class="transition-colors"
          :class="i === breadcrumbs.length - 1
            ? 'text-gray-200 font-medium'
            : 'text-gray-500 hover:text-gray-300 cursor-pointer'"
        >{{ crumb.label }}</span>
        <span v-if="i < breadcrumbs.length - 1" class="text-gray-700">/</span>
      </button>
    </nav>

    <div class="flex flex-1 gap-4 min-h-0">
      <!-- File Tree Panel -->
      <div class="w-72 shrink-0 flex flex-col rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 class="text-sm font-medium text-gray-300">Files</h3>
          <button
            class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            @click="loadTree(currentPath)"
          >
            <svg
              class="h-3.5 w-3.5"
              :class="{ 'animate-spin': isLoading }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div v-if="error && !selectedFile" class="px-4 py-2 text-xs text-red-400">{{ error }}</div>

        <div class="flex-1 overflow-y-auto py-1 scrollbar-none">
          <p v-if="flatTree.length === 0 && !isLoading" class="px-4 py-8 text-center text-xs text-gray-600">
            No files found
          </p>

          <button
            v-for="item in flatTree"
            :key="item.node.path"
            class="flex w-full items-center gap-2 py-1.5 text-xs transition-all duration-150 group"
            :class="item.node.type === 'file' && selectedFile?.path === item.node.path
              ? 'bg-shazam-500/10 text-shazam-400'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'"
            :style="{ paddingLeft: (item.depth * 16 + 16) + 'px', paddingRight: '16px' }"
            @click="item.node.type === 'directory' ? toggleDir(item.node) : selectFile(item.node.path)"
          >
            <!-- Expand chevron for directories -->
            <span v-if="item.node.type === 'directory'" class="w-3 text-[10px] text-gray-600 transition-transform" :class="expandedDirs.has(item.node.path) ? 'rotate-90' : ''">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <span v-else class="w-3" />

            <!-- Icon -->
            <span :class="iconColor(iconFor(item.node))" class="text-[11px] shrink-0">
              <svg v-if="item.node.type === 'directory'" class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <svg v-else class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>

            <span class="truncate">{{ item.node.name }}</span>
          </button>
        </div>
      </div>

      <!-- File Content Panel -->
      <div class="flex-1 flex flex-col rounded-xl border border-gray-800 bg-gray-900 overflow-hidden min-w-0">
        <template v-if="selectedFile">
          <!-- File header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="text-sm font-medium text-gray-200 truncate">{{ selectedFile.path.split('/').pop() }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 shrink-0">{{ languageLabel }}</span>
              <span class="text-[10px] text-gray-600 shrink-0">{{ fileSize }}</span>
              <span class="text-[10px] text-gray-600 shrink-0">{{ selectedFile.extension }}</span>
              <span v-if="hasUnsavedChanges" class="text-[10px] text-yellow-500 shrink-0">unsaved</span>
              <span
                v-if="saveMessage"
                class="text-[10px] shrink-0 transition-opacity"
                :class="saveMessage.startsWith('Save failed') ? 'text-red-400' : 'text-emerald-400'"
              >{{ saveMessage }}</span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <AppButton
                :variant="isEditing ? 'outline' : 'ghost'"
                size="xs"
                @click="isEditing = !isEditing"
              >
                {{ isEditing ? 'Read Only' : 'Edit' }}
              </AppButton>
              <AppButton
                v-if="hasUnsavedChanges"
                variant="primary"
                size="xs"
                :loading="isSaving"
                @click="handleSave"
              >
                Save
              </AppButton>
            </div>
          </div>

          <!-- File path sub-header -->
          <div class="px-4 py-1.5 bg-gray-900/50 border-b border-gray-800/50">
            <p class="text-[10px] text-gray-600 font-mono truncate">{{ selectedFile.path }}</p>
          </div>

          <!-- Content area -->
          <div class="flex-1 overflow-auto">
            <div v-if="isLoadingFile" class="flex items-center justify-center h-full">
              <div class="h-5 w-5 border-2 border-shazam-500/30 border-t-shazam-500 rounded-full animate-spin" />
            </div>
            <template v-else>
              <!-- Edit mode -->
              <textarea
                v-if="isEditing"
                v-model="editorContent"
                class="w-full h-full bg-transparent text-gray-300 font-mono text-[13px] leading-relaxed p-4 resize-none focus:outline-none"
                spellcheck="false"
              />
              <!-- Read mode -->
              <pre
                v-else
                :class="languageClass"
                class="text-gray-300 font-mono text-[13px] leading-relaxed p-4 whitespace-pre-wrap break-words"
              >{{ selectedFile.content }}</pre>
            </template>
          </div>
        </template>

        <!-- Empty state -->
        <template v-else>
          <div class="flex-1 flex flex-col items-center justify-center text-gray-600 gap-3">
            <svg class="h-10 w-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p class="text-sm text-gray-500">Select a file to view its contents</p>
            <p class="text-xs text-gray-700">Browse the project tree on the left</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
