<script setup lang="ts">
import type { MemoryTreeNode } from '@/types';

interface Props {
  node: MemoryTreeNode;
  selectedPath: string | null;
  expandedDirs: Set<string>;
  depth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
});

const emit = defineEmits<{
  toggleDir: [path: string];
  selectFile: [path: string];
}>();

function children(node: MemoryTreeNode): MemoryTreeNode[] {
  return Array.isArray(node.children) ? node.children : [];
}

const isExpanded = () => props.expandedDirs.has(props.node.path);
const isSelected = () => props.selectedPath === props.node.path;

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function fileIconColor(name: string): string {
  const ext = fileExtension(name);
  switch (ext) {
    case 'md': return 'text-sky-400';
    case 'ts':
    case 'tsx': return 'text-blue-400';
    case 'vue': return 'text-emerald-400';
    case 'json': return 'text-yellow-400';
    case 'yaml':
    case 'yml': return 'text-pink-400';
    case 'css': return 'text-purple-400';
    default: return 'text-gray-500';
  }
}
</script>

<template>
  <div class="tree-node">
    <!-- Directory node -->
    <button
      v-if="node.type === 'directory'"
      class="group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-all duration-150 hover:bg-gray-800/60 min-h-[32px]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="emit('toggleDir', node.path)"
    >
      <!-- Chevron -->
      <svg
        class="h-3.5 w-3.5 shrink-0 text-gray-600 transition-transform duration-200 group-hover:text-gray-400"
        :class="isExpanded() ? 'rotate-90' : ''"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M6 6l4 4-4 4V6z" />
      </svg>
      <!-- Folder icon -->
      <svg
        class="h-4 w-4 shrink-0 transition-colors duration-150"
        :class="isExpanded() ? 'text-shazam-400' : 'text-yellow-500/70'"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          v-if="isExpanded()"
          d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1H8a3 3 0 00-3 3v3.5a1.5 1.5 0 01-3 0V6z"
        />
        <path
          v-else
          d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        />
      </svg>
      <span class="truncate font-medium text-gray-300 group-hover:text-white">{{ node.name }}</span>
      <!-- Child count -->
      <span
        v-if="children(node).length > 0"
        class="ml-auto shrink-0 rounded-full bg-gray-800/60 px-1.5 py-0.5 text-[9px] tabular-nums text-gray-600 group-hover:text-gray-500"
      >
        {{ children(node).length }}
      </span>
    </button>

    <!-- File node -->
    <button
      v-else
      class="group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-all duration-150 min-h-[32px]"
      :class="isSelected()
        ? 'bg-shazam-500/10 text-shazam-400 ring-1 ring-inset ring-shazam-500/20'
        : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-300'"
      :style="{ paddingLeft: `${depth * 12 + 8 + 20}px` }"
      @click="emit('selectFile', node.path)"
    >
      <!-- File icon -->
      <svg
        class="h-3.5 w-3.5 shrink-0 transition-colors duration-150"
        :class="isSelected() ? 'text-shazam-400' : fileIconColor(node.name)"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fill-rule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          clip-rule="evenodd"
        />
      </svg>
      <span class="truncate">{{ node.name }}</span>
    </button>

    <!-- Recursive children with collapse animation -->
    <div
      v-if="node.type === 'directory'"
      class="tree-children overflow-hidden"
      :class="isExpanded() ? 'tree-children-expanded' : 'tree-children-collapsed'"
    >
      <div v-if="isExpanded()" class="relative">
        <!-- Indent guide line -->
        <div
          v-if="depth < 4"
          class="absolute bottom-0 top-0 w-px bg-gray-800/50"
          :style="{ left: `${depth * 12 + 18}px` }"
        />
        <MemoryTreeNode
          v-for="child in children(node)"
          :key="child.path"
          :node="child"
          :selected-path="selectedPath"
          :expanded-dirs="expandedDirs"
          :depth="depth + 1"
          @toggle-dir="emit('toggleDir', $event)"
          @select-file="emit('selectFile', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tree-children-expanded {
  animation: treeExpand 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.tree-children-collapsed {
  max-height: 0;
}

@keyframes treeExpand {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    max-height: 2000px;
    transform: translateY(0);
  }
}
</style>
