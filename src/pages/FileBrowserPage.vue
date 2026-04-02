<script setup lang="ts">
import { ref } from 'vue';
import { useFileBrowser } from '@/composables/useFileBrowser';
import FileTree from '@/components/features/FileTree.vue';
import AppButton from '@/components/common/Button.vue';

const {
  selectedFile,
  isLoading,
  isLoadingFile,
  isSaving,
  error,
  saveMessage,
  editorContent,
  isEditing,
  currentPath,
  breadcrumbs,
  languageLabel,
  languageClass,
  fileSize,
  hasUnsavedChanges,
  flatTree,
  expandedDirs,
  loadTree,
  selectFile,
  handleSave,
  toggleDir,
  navigateBreadcrumb,
} = useFileBrowser();

const copySuccess = ref(false);

async function copyPathToClipboard() {
  if (!selectedFile.value) return;
  try {
    await navigator.clipboard.writeText(selectedFile.value.path);
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 1500);
  } catch {
    // Clipboard API not available
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 px-1 text-xs" aria-label="File breadcrumb">
      <button
        v-for="(crumb, i) in breadcrumbs"
        :key="crumb.path"
        class="flex items-center gap-1.5"
        :aria-label="`Navigate to ${crumb.label}`"
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
      <FileTree
        :flat-tree="flatTree"
        :expanded-dirs="expandedDirs"
        :selected-path="selectedFile?.path ?? null"
        :is-loading="isLoading"
        :error="error"
        :has-selected-file="!!selectedFile"
        :current-path="currentPath"
        @toggle-dir="toggleDir"
        @select-file="selectFile"
        @refresh="loadTree"
      />

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
                aria-label="Toggle edit mode"
                @click="isEditing = !isEditing"
              >
                {{ isEditing ? 'Read Only' : 'Edit' }}
              </AppButton>
              <AppButton
                v-if="hasUnsavedChanges"
                variant="primary"
                size="xs"
                :loading="isSaving"
                aria-label="Save file"
                @click="handleSave"
              >
                Save
              </AppButton>
            </div>
          </div>

          <!-- File path sub-header -->
          <div class="px-4 py-1.5 bg-gray-900/50 border-b border-gray-800/50 flex items-center gap-2">
            <p class="text-[10px] text-gray-600 font-mono truncate flex-1">{{ selectedFile.path }}</p>
            <button
              class="shrink-0 rounded p-1 text-gray-600 hover:text-gray-300 transition-colors"
              aria-label="Copy file path to clipboard"
              @click="copyPathToClipboard"
            >
              <svg v-if="copySuccess" class="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
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
                aria-label="File editor"
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
