<script setup lang="ts">
import { computed } from 'vue';
import { useSessions } from '@/composables/useSessions';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/Button.vue';
import SessionActiveCard from '@/components/features/SessionActiveCard.vue';
import SessionIdleRow from '@/components/features/SessionIdleRow.vue';

const {
  pool,
  now,
  isLoading,
  error,
  ws,
  sessions,
  activeSessions,
  idleSessions,
  totalTasks,
  activeCount,
  loadPool,
  utilizationPercent,
} = useSessions();

const activeSessionUtilizations = computed(() =>
  activeSessions.value.map((s) => utilizationPercent(s.task_count))
);
</script>

<template>
  <div class="sessions-page">
    <ErrorBoundary :error="error" />
    <LoadingSpinner v-if="isLoading" label="Loading sessions..." />

    <!-- Error Retry -->
    <div v-else-if="!pool && error" class="flex flex-col items-center gap-4 rounded-2xl border border-gray-800 bg-surface-card px-6 py-16 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
        <!---->
      </div>
      <div>
        <p class="text-sm font-medium text-gray-300">Sessions could not be loaded</p>
        <p class="mt-1 text-xs text-gray-500">Check that the backend is running and try again.</p>
      </div>
      <AppButton variant="primary" @click="loadPool">Retry</AppButton>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="sessions.length === 0"
      title="No active sessions"
      description="Sessions will appear here when agents start executing tasks."
    />

    <!-- Main Content -->
    <div v-else class="space-y-5 sm:space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-shazam-500/10 text-base ring-1 ring-shazam-500/20 sm:h-10 sm:w-10 sm:text-lg">
              <!---->
            </div>
            <div>
              <h1 class="page-title">Session Pool</h1>
              <p class="page-subtitle">Active Claude sessions per agent</p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- WS connection indicator -->
          <div
            class="flex items-center gap-1.5 rounded-lg border border-gray-800/60 bg-surface-card px-3 py-1.5"
            :aria-label="ws.isConnected.value ? 'WebSocket connected' : 'WebSocket disconnected'"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="ws.isConnected.value ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'"
            />
            <span class="text-[10px] font-medium" :class="ws.isConnected.value ? 'text-emerald-400' : 'text-red-400'">
              {{ ws.isConnected.value ? 'Live' : 'Offline' }}
            </span>
          </div>
          <AppButton variant="secondary" size="sm" @click="loadPool">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Refresh
          </AppButton>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div class="stat-card">
          <p class="stat-label">Total Sessions</p>
          <p class="stat-value text-white">{{ sessions.length }}</p>
        </div>
        <div class="stat-card">
          <div class="flex items-center gap-1.5">
            <p class="stat-value text-emerald-400">{{ activeCount }}</p>
            <span v-if="activeCount > 0" class="mt-1 h-2 w-2 animate-pulse rounded-full bg-emerald-400 sm:mt-1.5" />
          </div>
          <p class="stat-label">Active</p>
        </div>
        <div class="stat-card">
          <p class="stat-value text-gray-500">{{ idleSessions.length }}</p>
          <p class="stat-label">Idle</p>
        </div>
        <div class="stat-card">
          <p class="stat-value text-shazam-400">{{ totalTasks }}</p>
          <p class="stat-label">Tasks Done</p>
        </div>
      </div>

      <!-- Active Sessions -->
      <div v-if="activeSessions.length > 0">
        <div class="mb-3 flex items-center gap-2">
          <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">
            Active Sessions
          </h2>
          <span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-400">
            {{ activeSessions.length }}
          </span>
          <div class="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SessionActiveCard
            v-for="(session, idx) in activeSessions"
            :key="session.key"
            :session="session"
            :now-ms="now"
            :utilization-percent="activeSessionUtilizations[idx] ?? 0"
            :animation-delay="idx * 60"
          />
        </div>
      </div>

      <!-- Idle Sessions -->
      <div v-if="idleSessions.length > 0">
        <div class="mb-3 flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-gray-600" />
          <h2 class="text-sm font-bold uppercase tracking-wider text-gray-500">
            Idle Sessions
          </h2>
          <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
            {{ idleSessions.length }}
          </span>
          <div class="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent" />
        </div>

        <div class="rounded-2xl border border-gray-800/60 bg-surface-card">
          <div class="divide-y divide-gray-800/50">
            <SessionIdleRow
              v-for="(session, idx) in idleSessions"
              :key="session.key"
              :session="session"
              :now-ms="now"
              :animation-delay="(activeSessions.length + idx) * 40"
            />
          </div>
        </div>
      </div>

      <!-- Pool Health -->
      <div class="rounded-2xl border border-gray-800/40 bg-surface-card/30 p-4 sm:p-5">
        <h3 class="mb-3 micro-label">Pool Overview</h3>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-gray-500">Capacity</span>
            <span class="font-mono font-semibold text-gray-300">{{ sessions.length }} sessions</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500">Utilization</span>
            <span class="font-mono font-semibold" :class="activeCount > 0 ? 'text-emerald-400' : 'text-gray-400'">
              {{ sessions.length > 0 ? Math.round((activeCount / sessions.length) * 100) : 0 }}%
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500">Connection</span>
            <span class="font-semibold" :class="ws.isConnected.value ? 'text-emerald-400' : 'text-red-400'">
              {{ ws.isConnected.value ? 'Connected' : 'Disconnected' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sessions-page {
  animation: pageIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pageIn {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
