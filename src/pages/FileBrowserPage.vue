<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { fetchFileTree, fetchFileContent, saveFileContent } from '@/api/fileService';
import type { FileTreeNode, FileContent } from '@/api/fileService';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useWebSocket } from '@/composables/useWebSocket';

const { activeCompany } = useActiveCompany();
const ws = useWebSocket();

const tree = ref<FileTreeNode[]>([]);
const selectedFile = ref<FileContent | null>(null);
const expandedDirs = ref<Set<string>>(new Set());
const isLoading = ref(false);
const isSaving = ref(false);
const error = ref<string | null>(null);
const fileChanged = ref(false);
const editorContent = ref('');
const isEditing = ref(false);

const monacoLanguage = computed(() => {
  const ext = selectedFile.value?.extension || '';
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
    '.vue': 'html', '.html': 'html', '.css': 'css', '.scss': 'scss',
    '.ex': 'elixir', '.exs': 'elixir', '.rs': 'rust', '.py': 'python',
    '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.md': 'markdown',
    '.sh': 'shell', '.sql': 'sql', '.toml': 'ini', '.xml': 'xml',
  };
  return map[ext] || 'plaintext';
});

const fileSize = computed(() => {
  const size = selectedFile.value?.size || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1048576).toFixed(1)} MB`;
});

const hasUnsavedChanges = computed(() => isEditing.value && editorContent.value !== selectedFile.value?.content);

// Flatten tree into visible items with depth
interface FlatNode { node: FileTreeNode; depth: number }
const flatTree = computed<FlatNode[]>(() => {
  const result: FlatNode[] = [];
  function walk(nodes: FileTreeNode[], depth: number) {
    for (const node of nodes) {
      result.push({ node, depth });
      if (node.type === 'directory' && expandedDirs.value.has(node.path)) {
        walk(node.children || [], depth + 1);
      }
    }
  }
  walk(tree.value, 0);
  return result;
});

async function loadTree() {
  isLoading.value = true;
  error.value = null;
  try {
    console.log('[FileBrowser] Loading tree...');
    const result = await fetchFileTree('', 4);
    console.log('[FileBrowser] Got', result.length, 'items');
    tree.value = result;
    if (result.length === 0) {
      error.value = 'No files found. Check if workspace is set.';
    }
  } catch (e) {
    console.error('[FileBrowser] Error:', e);
    error.value = e instanceof Error ? e.message : 'Failed to load file tree';
  } finally {
    isLoading.value = false;
  }
}

async function selectFile(path: string) {
  const content = await fetchFileContent(path);
  if (content) {
    selectedFile.value = content;
    editorContent.value = content.content;
    fileChanged.value = false;
    isEditing.value = false;
  }
}

async function handleSave() {
  if (!selectedFile.value) return;
  isSaving.value = true;
  const ok = await saveFileContent(selectedFile.value.path, editorContent.value);
  isSaving.value = false;
  if (ok) {
    selectedFile.value = { ...selectedFile.value, content: editorContent.value };
    fileChanged.value = false;
  }
}

function toggleDir(path: string) {
  const next = new Set(expandedDirs.value);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  expandedDirs.value = next;
}

function iconFor(node: FileTreeNode): string {
  if (node.type === 'directory') return '📁';
  const map: Record<string, string> = {
    '.ts': '🟦', '.tsx': '🟦', '.js': '🟨', '.jsx': '🟨',
    '.vue': '🟩', '.html': '🌐', '.css': '🎨', '.ex': '💜', '.exs': '💜',
    '.rs': '🦀', '.py': '🐍', '.json': '📋', '.yaml': '⚙️', '.yml': '⚙️',
    '.md': '📝', '.sh': '🖥️', '.toml': '⚙️', '.lock': '🔒',
  };
  return map[node.extension || ''] || '📄';
}

// Live file events
ws.on('file_changed' as any, (event: any) => {
  const path = event.data?.path || event.title;
  if (selectedFile.value && path === selectedFile.value.path && !hasUnsavedChanges.value) {
    selectFile(path);
  } else if (selectedFile.value?.path === path) {
    fileChanged.value = true;
  }
});
ws.on('file_created' as any, () => loadTree());
ws.on('file_deleted' as any, (event: any) => {
  if (selectedFile.value?.path === (event.data?.path || event.title)) selectedFile.value = null;
  loadTree();
});

watch(() => activeCompany.value?.name, (n, o) => { if (n && n !== o) { selectedFile.value = null; loadTree(); } });
onMounted(loadTree);
</script>

<template>
  <div class="flex h-full gap-4">
    <!-- File Tree -->
    <div class="w-72 shrink-0 flex flex-col rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 class="text-sm font-medium text-gray-300">Files</h3>
        <button class="text-xs text-gray-500 hover:text-gray-300" @click="loadTree">{{ isLoading ? '...' : '↻' }}</button>
      </div>
      <div v-if="error" class="px-4 py-2 text-xs text-red-400">{{ error }}</div>
      <div class="flex-1 overflow-y-auto py-1 scrollbar-none">
        <p v-if="flatTree.length === 0 && !isLoading" class="px-4 py-8 text-center text-xs text-gray-600">No files found</p>
        <button
          v-for="item in flatTree"
          :key="item.node.path"
          class="flex w-full items-center gap-1.5 py-1 text-xs transition-colors truncate"
          :class="item.node.type === 'file' && selectedFile?.path === item.node.path
            ? 'text-shazam-400 bg-shazam-500/10'
            : item.node.type === 'directory'
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'"
          :style="{ paddingLeft: (item.depth * 14 + 16) + 'px' }"
          @click="item.node.type === 'directory' ? toggleDir(item.node.path) : selectFile(item.node.path)"
        >
          <span v-if="item.node.type === 'directory'" class="text-[10px] w-3">{{ expandedDirs.has(item.node.path) ? '▼' : '▶' }}</span>
          <span v-else class="w-3" />
          <span>{{ iconFor(item.node) }}</span>
          <span class="truncate">{{ item.node.name }}</span>
        </button>
      </div>
    </div>

    <!-- Editor -->
    <div class="flex-1 flex flex-col rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <template v-if="selectedFile">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div class="flex items-center gap-2 min-w-0">
            <span>{{ iconFor({ name: '', path: '', type: 'file', extension: selectedFile.extension, children: [] }) }}</span>
            <span class="text-sm font-medium text-gray-200 truncate">{{ selectedFile.path }}</span>
            <span class="text-[10px] text-gray-600">{{ fileSize }}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{{ monacoLanguage }}</span>
            <span v-if="fileChanged" class="h-2 w-2 rounded-full bg-shazam-400 animate-pulse" title="Updated externally" />
            <span v-if="hasUnsavedChanges" class="text-[10px] text-yellow-500">unsaved</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              :class="isEditing ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-400 hover:text-gray-200'"
              @click="isEditing = !isEditing"
            >{{ isEditing ? 'Read Only' : 'Edit' }}</button>
            <button
              v-if="hasUnsavedChanges"
              class="rounded-lg bg-shazam-500/20 px-3 py-1.5 text-xs font-medium text-shazam-400 hover:bg-shazam-500/30 disabled:opacity-50"
              :disabled="isSaving"
              @click="handleSave"
            >{{ isSaving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
        <div class="flex-1 overflow-hidden">
          <vue-monaco-editor
            v-model:value="editorContent"
            :language="monacoLanguage"
            theme="vs-dark"
            :options="{
              readOnly: !isEditing,
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12 },
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              smoothScrolling: true,
            }"
          />
        </div>
      </template>
      <template v-else>
        <div class="flex-1 flex flex-col items-center justify-center text-gray-600">
          <span class="text-4xl mb-3">📂</span>
          <p class="text-sm">Select a file to view</p>
          <p class="text-xs mt-1 text-gray-700">Files update in real-time when agents make changes</p>
        </div>
      </template>
    </div>
  </div>
</template>
