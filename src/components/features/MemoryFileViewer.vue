<script setup lang="ts">
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import type { MemoryFileContent } from '@/types';

defineProps<{
  selectedFile: MemoryFileContent | null;
  isLoadingFile: boolean;
  fileError: string | null;
  hasFrontmatter: boolean;
}>();

function formatFrontmatterValue(val: string): string {
  return val.length > 80 ? val.slice(0, 80) + '...' : val;
}
</script>

<template>
  <div class="rounded-2xl border border-gray-800/60 bg-surface-card lg:col-span-8 xl:col-span-9" aria-label="Memory file viewer">
    <!-- Loading state -->
    <div v-if="isLoadingFile" class="flex items-center justify-center p-12">
      <LoadingSpinner size="sm" label="Loading file..." />
    </div>

    <!-- Error state -->
    <div v-else-if="fileError" class="p-6 sm:p-8" role="alert">
      <ErrorBoundary :error="fileError" />
    </div>

    <!-- File content -->
    <div v-else-if="selectedFile" class="flex flex-col">
      <!-- File header bar -->
      <div class="flex items-center gap-3 border-b border-gray-800/50 px-4 py-2.5 sm:px-5">
        <svg class="h-4 w-4 shrink-0 text-gray-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
        </svg>
        <p class="min-w-0 truncate font-mono text-[11px] text-gray-400 sm:text-xs" aria-label="File path">{{ selectedFile.path }}</p>
      </div>

      <!-- Frontmatter badges -->
      <div
        v-if="hasFrontmatter && selectedFile.frontmatter"
        class="border-b border-gray-800/50 bg-surface px-4 py-2.5 sm:px-5"
        aria-label="File frontmatter"
      >
        <div class="flex flex-wrap gap-2">
          <div
            v-for="[key, val] in Object.entries(selectedFile.frontmatter ?? {})"
            :key="key"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-800/50 bg-surface-card px-2.5 py-1"
          >
            <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-600">{{ key }}</span>
            <span class="text-[10px] text-gray-400">{{ formatFrontmatterValue(val) }}</span>
          </div>
        </div>
      </div>

      <!-- Content area -->
      <div class="max-h-[350px] overflow-y-auto p-4 scrollbar-thin sm:max-h-[calc(100vh-340px)] sm:p-5">
        <pre class="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-300 sm:text-xs" aria-label="File content">{{ selectedFile.content }}</pre>
      </div>
    </div>

    <!-- Empty placeholder -->
    <div v-else class="flex flex-col items-center justify-center gap-3 py-16 sm:py-24">
      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-800/50 text-lg" aria-hidden="true">
        📄
      </div>
      <p class="text-xs text-gray-600 sm:text-sm">Select a file from the tree to view its contents</p>
    </div>
  </div>
</template>
