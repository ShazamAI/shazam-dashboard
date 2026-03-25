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

// Language detection for syntax hint
const languageClass = computed(() => {
  const ext = selectedFile.value?.extension || '';
  const map: Record<string, string> = {
    '.ts': 'language-typescript', '.tsx': 'language-typescript',
    '.js': 'language-javascript', '.jsx': 'language-javascript',
    '.vue': 'language-html', '.html': 'language-html',
    '.css': 'language-css', '.scss': 'language-css',
    '.ex': 'language-elixir', '.exs': 'language-elixir',
    '.rs': 'language-rust',
    '.py': 'language-python',
    '.json': 'language-json',
    '.yaml': 'language-yaml', '.yml': 'language-yaml',
    '.md': 'language-markdown',
    '.sh': 'language-bash',
  };
  return map[ext] || '';
});

const fileSize = computed(() => {
  const size = selectedFile.value?.size || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1048576).toFixed(1)} MB`;
});

async function loadTree() {
  isLoading.value = true;
  error.value = null;
  try {
    tree.value = await fetchFileTree('', 4);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load file tree';
  } finally {
    isLoading.value = false;
  }
}

async function selectFile(path: string) {
  const content = await fetchFileContent(path);
  if (content) {
    selectedFile.value = content;
    fileChanged.value = false;
  }
}

async function handleSave() {
  if (!selectedFile.value) return;
  isSaving.value = true;
  const ok = await saveFileContent(selectedFile.value.path, selectedFile.value.content);
  isSaving.value = false;
  if (ok) fileChanged.value = false;
}

function toggleDir(path: string) {
  const next = new Set(expandedDirs.value);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  expandedDirs.value = next;
}

function iconForExtension(ext: string): string {
  const map: Record<string, string> = {
    '.ts': '🟦', '.tsx': '🟦', '.js': '🟨', '.jsx': '🟨',
    '.vue': '🟩', '.html': '🌐', '.css': '🎨', '.scss': '🎨',
    '.ex': '💜', '.exs': '💜', '.rs': '🦀',
    '.py': '🐍', '.json': '📋', '.yaml': '⚙️', '.yml': '⚙️',
    '.md': '📝', '.sh': '🖥️', '.png': '🖼️', '.jpg': '🖼️',
    '.svg': '🖼️', '.toml': '⚙️', '.lock': '🔒',
  };
  return map[ext] || '📄';
}

// Live file binding via WebSocket
ws.on('file_changed' as any, (event: any) => {
  if (selectedFile.value && event.data?.path === selectedFile.value.path) {
    fileChanged.value = true;
    selectFile(event.data.path); // Auto-reload
  }
});

ws.on('file_created' as any, () => loadTree());
ws.on('file_deleted' as any, (event: any) => {
  if (selectedFile.value?.path === event.data?.path) {
    selectedFile.value = null;
  }
  loadTree();
});

// Reload when project changes
watch(() => activeCompany.value?.name, (name, old) => {
  if (name && name !== old) {
    selectedFile.value = null;
    loadTree();
  }
});

onMounted(loadTree);
</script>

<template>
  <div class="flex h-full gap-4">
    <!-- Left: File Tree -->
    <div class="w-72 shrink-0 flex flex-col rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 class="text-sm font-medium text-gray-300">Files</h3>
        <button
          class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          @click="loadTree"
        >
          {{ isLoading ? '...' : '↻' }}
        </button>
      </div>

      <div v-if="error" class="px-4 py-2 text-xs text-red-400">{{ error }}</div>

      <div class="flex-1 overflow-y-auto py-2 scrollbar-none">
        <template v-if="tree.length === 0 && !isLoading">
          <p class="px-4 py-8 text-center text-xs text-gray-600">No files found</p>
        </template>

        <template v-for="node in tree" :key="node.path">
          <div
            v-if="node.type === 'directory'"
            class="select-none"
          >
            <button
              class="flex w-full items-center gap-1.5 px-4 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors"
              @click="toggleDir(node.path)"
            >
              <span class="text-[10px]">{{ expandedDirs.has(node.path) ? '▼' : '▶' }}</span>
              <span>📁</span>
              <span class="truncate">{{ node.name }}</span>
            </button>

            <div v-if="expandedDirs.has(node.path)" class="pl-3">
              <template v-for="child in node.children" :key="child.path">
                <button
                  v-if="child.type === 'file'"
                  class="flex w-full items-center gap-1.5 px-4 py-1 text-xs transition-colors truncate"
                  :class="selectedFile?.path === child.path
                    ? 'text-shazam-400 bg-shazam-500/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'"
                  @click="selectFile(child.path)"
                >
                  <span>{{ iconForExtension(child.extension || '') }}</span>
                  <span class="truncate">{{ child.name }}</span>
                </button>
                <div v-else>
                  <button
                    class="flex w-full items-center gap-1.5 px-4 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors"
                    @click="toggleDir(child.path)"
                  >
                    <span class="text-[10px]">{{ expandedDirs.has(child.path) ? '▼' : '▶' }}</span>
                    <span>📁</span>
                    <span class="truncate">{{ child.name }}</span>
                  </button>
                  <div v-if="expandedDirs.has(child.path)" class="pl-3">
                    <button
                      v-for="grandchild in child.children"
                      :key="grandchild.path"
                      class="flex w-full items-center gap-1.5 px-4 py-1 text-xs transition-colors truncate"
                      :class="selectedFile?.path === grandchild.path
                        ? 'text-shazam-400 bg-shazam-500/10'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'"
                      @click="grandchild.type === 'directory' ? toggleDir(grandchild.path) : selectFile(grandchild.path)"
                    >
                      <span>{{ grandchild.type === 'directory' ? '📁' : iconForExtension(grandchild.extension || '') }}</span>
                      <span class="truncate">{{ grandchild.name }}</span>
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <button
            v-else
            class="flex w-full items-center gap-1.5 px-4 py-1 text-xs transition-colors truncate"
            :class="selectedFile?.path === node.path
              ? 'text-shazam-400 bg-shazam-500/10'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'"
            @click="selectFile(node.path)"
          >
            <span>{{ iconForExtension(node.extension || '') }}</span>
            <span class="truncate">{{ node.name }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Right: File Content Viewer -->
    <div class="flex-1 flex flex-col rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <template v-if="selectedFile">
        <!-- File header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div class="flex items-center gap-2 min-w-0">
            <span>{{ iconForExtension(selectedFile.extension) }}</span>
            <span class="text-sm font-medium text-gray-200 truncate">{{ selectedFile.path }}</span>
            <span class="text-[10px] text-gray-600">{{ fileSize }}</span>
            <span
              v-if="fileChanged"
              class="h-2 w-2 rounded-full bg-shazam-400 animate-pulse"
              title="File updated"
            />
          </div>
          <button
            class="rounded-lg bg-shazam-500/20 px-3 py-1.5 text-xs font-medium text-shazam-400 hover:bg-shazam-500/30 transition-all disabled:opacity-50"
            :disabled="isSaving"
            @click="handleSave"
          >
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <!-- File content -->
        <div class="flex-1 overflow-auto p-4">
          <pre
            class="text-xs font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed"
            :class="languageClass"
          >{{ selectedFile.content }}</pre>
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
