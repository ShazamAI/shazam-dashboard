<script setup lang="ts">
import { ref } from 'vue';
import type { FlatNode, TreeNode } from '@/composables/useFileBrowser';
import { FILE_ICON_MAP } from '@/constants/languages';

const props = defineProps<{
  flatTree: FlatNode[];
  expandedDirs: Set<string>;
  selectedPath: string | null;
  isLoading: boolean;
  error: string | null;
  hasSelectedFile: boolean;
  currentPath: string;
}>();

const emit = defineEmits<{
  toggleDir: [node: TreeNode];
  selectFile: [path: string];
  refresh: [path: string];
}>();

const focusedIndex = ref(-1);

function iconFor(node: TreeNode, expandedDirs: Set<string>): string {
  if (node.type === 'directory') {
    return expandedDirs.has(node.path) ? 'folder-open' : 'folder';
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

function handleKeyDown(e: KeyboardEvent) {
  const items = props.flatTree;
  if (items.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusedIndex.value = Math.min(focusedIndex.value + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusedIndex.value = Math.max(focusedIndex.value - 1, 0);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    const item = items[focusedIndex.value];
    if (!item) return;
    if (item.node.type === 'directory') {
      emit('toggleDir', item.node);
    } else {
      emit('selectFile', item.node.path);
    }
  }
}
</script>

<template>
  <div
    class="w-72 shrink-0 flex flex-col rounded-xl border border-gray-800 bg-gray-900 overflow-hidden"
    role="tree"
    aria-label="File tree"
    @keydown="handleKeyDown"
  >
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <h3 class="text-sm font-medium text-gray-300">Files</h3>
      <button
        class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Refresh file tree"
        @click="emit('refresh', currentPath)"
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

    <div v-if="error && !hasSelectedFile" class="px-4 py-2 text-xs text-red-400" role="alert">{{ error }}</div>

    <div class="flex-1 overflow-y-auto py-1 scrollbar-none">
      <p v-if="flatTree.length === 0 && !isLoading" class="px-4 py-8 text-center text-xs text-gray-600">
        No files found
      </p>

      <button
        v-for="(item, index) in flatTree"
        :key="item.node.path"
        role="treeitem"
        :aria-label="`${item.node.type === 'directory' ? 'Directory' : 'File'}: ${item.node.name}`"
        :aria-expanded="item.node.type === 'directory' ? expandedDirs.has(item.node.path) : undefined"
        :aria-selected="item.node.type === 'file' && selectedPath === item.node.path"
        :tabindex="index === focusedIndex ? 0 : -1"
        class="flex w-full items-center gap-2 py-1.5 text-xs transition-all duration-150 group"
        :class="[
          item.node.type === 'file' && selectedPath === item.node.path
            ? 'bg-shazam-500/10 text-shazam-400'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60',
          index === focusedIndex ? 'ring-1 ring-shazam-500/40' : '',
        ]"
        :style="{ paddingLeft: (item.depth * 16 + 16) + 'px', paddingRight: '16px' }"
        @click="item.node.type === 'directory' ? emit('toggleDir', item.node) : emit('selectFile', item.node.path)"
        @focus="focusedIndex = index"
      >
        <!-- Expand chevron for directories -->
        <span v-if="item.node.type === 'directory'" class="w-3 text-[10px] text-gray-600 transition-transform" :class="expandedDirs.has(item.node.path) ? 'rotate-90' : ''">
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
        <span v-else class="w-3" />

        <!-- Icon -->
        <span :class="iconColor(iconFor(item.node, expandedDirs))" class="text-[11px] shrink-0">
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
</template>
