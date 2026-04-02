<script setup lang="ts">
import type { Project } from '@/types';
import { formatRelativeDate } from '@/utils/formatters';

interface Props {
  project: Project;
  loading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced';
}

defineProps<Props>();

const emit = defineEmits<{
  start: [];
  stop: [];
  open: [];
  remove: [];
  sync: [];
}>();

const isRunning = (status: string) => status === 'running';
</script>

<template>
  <div
    class="group relative rounded-xl border transition-all duration-200 p-5"
    :class="isRunning(project.status)
      ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
      : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'"
  >
    <div class="flex items-center justify-between">
      <!-- Info -->
      <div class="flex items-center gap-4 min-w-0 flex-1">
        <div
          class="h-3 w-3 shrink-0 rounded-full"
          :class="isRunning(project.status) ? 'bg-green-400 shadow-lg shadow-green-400/40' : 'bg-gray-600'"
          :aria-label="'Project status: ' + project.status"
        />
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-base font-semibold text-white truncate">{{ project.name }}</h3>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              :class="isRunning(project.status)
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-700 text-gray-400'"
            >
              {{ project.status }}
            </span>
            <span v-if="project.agents_count" class="text-xs text-gray-500">
              {{ project.agents_count }} agents
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5 truncate font-mono">{{ project.path }}</p>
          <p v-if="project.last_used" class="text-[10px] text-gray-600 mt-0.5">
            Last used: {{ formatRelativeDate(project.last_used) }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 shrink-0 ml-4">
        <template v-if="isRunning(project.status)">
          <button
            class="rounded-lg px-4 py-2 text-xs font-medium transition-all"
            :class="syncStatus === 'synced'
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'"
            :disabled="syncStatus === 'syncing'"
            :aria-label="syncStatus === 'synced' ? 'Re-sync IDE configs' : 'Sync IDE configs'"
            @click="emit('sync')"
          >
            <svg v-if="syncStatus === 'syncing'" class="h-3.5 w-3.5 animate-spin inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else-if="syncStatus === 'synced'" class="h-3.5 w-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <svg v-else class="h-3.5 w-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ syncStatus === 'synced' ? 'Re-sync' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync' }}
          </button>
          <button
            class="rounded-lg bg-shazam-500/20 px-4 py-2 text-xs font-medium text-shazam-400 hover:bg-shazam-500/30 transition-all"
            @click="emit('open')"
          >
            Open
          </button>
          <button
            class="rounded-lg border border-gray-600 px-4 py-2 text-xs font-medium text-gray-400 hover:bg-gray-700 hover:text-red-400 transition-all"
            :disabled="loading"
            @click="emit('stop')"
          >
            {{ loading ? '...' : 'Stop' }}
          </button>
        </template>
        <template v-else>
          <button
            class="rounded-lg bg-green-500/20 px-4 py-2 text-xs font-medium text-green-400 hover:bg-green-500/30 transition-all"
            :disabled="loading"
            @click="emit('start')"
          >
            {{ loading ? 'Starting...' : 'Start' }}
          </button>
        </template>
        <button
          class="rounded-lg p-2 text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
          title="Remove from registry"
          aria-label="Remove project from registry"
          @click="emit('remove')"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
