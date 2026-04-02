<script setup lang="ts">
import { onMounted } from 'vue';
import { useMemoryTree } from '@/composables/useMemoryTree';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/Button.vue';
import MemoryTreeNodeVue from '@/components/features/MemoryTreeNode.vue';
import MemoryFileViewer from '@/components/features/MemoryFileViewer.vue';

const {
  treeNodes, isLoading, error, expandedDirs, hasContent, totalFiles,
  selectedFile, isLoadingFile, fileError, hasFrontmatter,
  loadTree, toggleDir, expandAll, collapseAll, selectFile,
} = useMemoryTree();

onMounted(async () => {
  await loadTree();
  if (treeNodes.value.length > 0) {
    expandAll();
  }
});
</script>

<template>
  <div class="memory-page">
    <ErrorBoundary :error="error" />
    <LoadingSpinner v-if="isLoading" label="Loading memory files..." />

    <EmptyState
      v-else-if="!hasContent && !error"
      title="No memory files"
      description="Memory and context files will appear here after agents complete tasks."
    />

    <div v-else-if="hasContent" class="space-y-4 sm:space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-shazam-500/10 text-base ring-1 ring-shazam-500/20 sm:h-10 sm:w-10 sm:text-lg">
              🧠
            </div>
            <div>
              <h1 class="page-title">Memory Browser</h1>
              <p class="page-subtitle">Browse agent learnings, skills, and context files</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="hidden text-xs tabular-nums text-gray-500 sm:inline">{{ totalFiles }} files</span>
          <AppButton variant="ghost" size="sm" @click="expandAll">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            Expand
          </AppButton>
          <AppButton variant="ghost" size="sm" @click="collapseAll">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
            Collapse
          </AppButton>
        </div>
      </div>

      <!-- Tree + File Viewer Layout -->
      <div class="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
        <!-- File Tree -->
        <div class="rounded-2xl border border-gray-800/60 bg-surface-card lg:col-span-4 xl:col-span-3">
          <div class="flex items-center justify-between border-b border-gray-800/50 px-4 py-2.5">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-shazam-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              <p class="text-xs font-semibold text-gray-400">.shazam/</p>
            </div>
          </div>
          <div class="max-h-[300px] overflow-y-auto p-1.5 scrollbar-thin sm:max-h-[400px] lg:max-h-[calc(100vh-260px)]">
            <MemoryTreeNodeVue
              v-for="node in treeNodes"
              :key="node.path"
              :node="node"
              :selected-path="selectedFile?.path ?? null"
              :expanded-dirs="expandedDirs"
              :depth="0"
              @toggle-dir="toggleDir"
              @select-file="selectFile"
            />
          </div>
        </div>

        <!-- File Content Viewer -->
        <MemoryFileViewer
          :selected-file="selectedFile"
          :is-loading-file="isLoadingFile"
          :file-error="fileError"
          :has-frontmatter="hasFrontmatter"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-page {
  animation: pageIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pageIn {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
</style>
