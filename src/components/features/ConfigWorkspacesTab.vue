<script setup lang="ts">
import type { WorkspaceInfo } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/Button.vue';

interface Props {
  workspaces: WorkspaceInfo[];
  isLoading: boolean;
  switchingTo: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  switch: [name: string];
}>();
</script>

<template>
  <div class="space-y-6">
    <LoadingSpinner v-if="isLoading" label="Loading workspaces..." size="sm" />

    <EmptyState
      v-else-if="workspaces.length === 0"
      title="No workspaces configured"
      description="Add workspaces to your shazam.yaml to manage multi-repo projects."
    />

    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div
        v-for="ws in workspaces"
        :key="ws.name"
        class="workspace-card rounded-2xl border bg-gradient-to-br from-surface-card to-gray-900 transition-all duration-300 hover:shadow-elevation-2"
        :class="ws.is_active ? 'border-shazam-500/30 shadow-glow-sm' : 'border-gray-800/60 hover:border-gray-700'"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-800/40 px-4 py-3 sm:px-5 sm:py-4">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ring-1"
              :class="ws.is_active
                ? 'bg-shazam-500/15 text-shazam-400 ring-shazam-500/30'
                : 'bg-gray-800 text-gray-400 ring-gray-700/50'"
            >{{ ws.name[0]?.toUpperCase() }}</div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-gray-200">{{ ws.name }}</p>
              <p class="truncate font-mono text-[10px] text-gray-500">{{ ws.path }}</p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span
              v-if="ws.is_active"
              class="inline-flex items-center gap-1 rounded-full bg-shazam-500/10 px-2.5 py-1 text-[10px] font-semibold text-shazam-400 ring-1 ring-shazam-500/20"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-shazam-400" />
              Active
            </span>
            <AppButton v-else variant="secondary" size="sm" :loading="switchingTo === ws.name" @click="emit('switch', ws.name)">
              Switch
            </AppButton>
          </div>
        </div>

        <!-- Body -->
        <div class="p-4 sm:p-5">
          <!-- Git status row -->
          <div class="mb-3 flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-1.5">
              <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
              <span class="text-xs font-medium text-gray-300">{{ ws.git.branch }}</span>
            </div>
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1"
              :class="ws.git.clean
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="ws.git.clean ? 'bg-emerald-400' : 'bg-yellow-400'" />
              {{ ws.git.clean ? 'Clean' : 'Dirty' }}
            </span>
            <span v-if="ws.git.modified_files.length > 0" class="text-[10px] tabular-nums text-gray-500">
              {{ ws.git.modified_files.length }} modified
            </span>
          </div>

          <!-- Modified files -->
          <div v-if="ws.git.modified_files.length > 0" class="mb-3">
            <p class="mb-1.5 micro-label">Modified Files</p>
            <div class="max-h-24 overflow-y-auto rounded-xl border border-gray-800/40 bg-surface p-2.5 scrollbar-thin">
              <p
                v-for="file in ws.git.modified_files"
                :key="file"
                class="truncate font-mono text-[11px] leading-relaxed text-gray-400"
              >{{ file }}</p>
            </div>
          </div>

          <!-- Recent commits -->
          <div v-if="ws.git.recent_commits.length > 0" class="mb-3">
            <p class="mb-1.5 micro-label">Recent Commits</p>
            <div class="space-y-1.5">
              <div
                v-for="commit in ws.git.recent_commits.slice(0, 3)"
                :key="commit.hash"
                class="flex items-baseline gap-2"
              >
                <span class="shrink-0 rounded-md bg-shazam-500/10 px-1.5 py-0.5 font-mono text-[10px] text-shazam-400">{{ commit.hash.slice(0, 7) }}</span>
                <span class="min-w-0 truncate text-xs text-gray-400">{{ commit.message }}</span>
              </div>
            </div>
          </div>

          <!-- Domains -->
          <div v-if="ws.domains.length > 0">
            <p class="mb-1.5 micro-label">Domains</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="domain in ws.domains"
                :key="domain"
                class="inline-flex rounded-md bg-gray-800/60 px-2 py-0.5 font-mono text-[10px] text-gray-400 ring-1 ring-gray-700/30"
              >{{ domain }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workspace-card {
  animation: cardIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
