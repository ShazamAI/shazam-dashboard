<script setup lang="ts">
import { computed, onMounted, ref, onUnmounted } from 'vue';
import { fetchSessionPool } from '@/api/configService';
import { useAsyncState } from '@/composables/useAsyncState';
import { useWebSocket } from '@/composables/useWebSocket';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/Button.vue';

const { data: pool, isLoading, error, execute: loadPool } = useAsyncState(
  () => fetchSessionPool(),
  { fallbackError: 'Failed to load session pool' },
);

const ws = useWebSocket();

// Auto-refresh on relevant WS events
ws.on('*', (event) => {
  if (
    event.type === 'agent_status_change' ||
    event.type === 'task_completed' ||
    event.type === 'task_started'
  ) {
    loadPool();
  }
});

// Live elapsed timer — ticks every second to update idle times
const now = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  loadPool();
  tickTimer = setInterval(() => { now.value = Date.now(); }, 1000);
});

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer);
});

// ─── Derived session list ───────────────────────────────
interface SessionRow {
  key: string;
  agent_name: string;
  task_count: number;
  last_used: string;
  idle: boolean;
}

const sessions = computed<SessionRow[]>(() => {
  if (!pool.value?.sessions) return [];
  return Object.entries(pool.value.sessions)
    .map(([key, session]) => ({ key, ...session }))
    .sort((a, b) => {
      // Active sessions first, then by most recently used
      if (a.idle !== b.idle) return a.idle ? 1 : -1;
      return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
    });
});

const activeSessions = computed(() => sessions.value.filter((s) => !s.idle));
const idleSessions = computed(() => sessions.value.filter((s) => s.idle));
const totalTasks = computed(() => sessions.value.reduce((sum, s) => sum + s.task_count, 0));
const activeCount = computed(() => pool.value?.active_sessions ?? 0);

// ─── Formatting ─────────────────────────────────────────
function formatIdleTime(lastUsed: string): string {
  const diff = now.value - new Date(lastUsed).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours < 24) return remainMinutes > 0 ? `${hours}h ${remainMinutes}m ago` : `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatIdleShort(lastUsed: string): string {
  const diff = now.value - new Date(lastUsed).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function agentInitials(name: string): string {
  const parts = name.replace(/_/g, ' ').split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface ColorSet { bg: string; text: string; ring: string }

const AGENT_COLORS: ColorSet[] = [
  { bg: 'bg-shazam-500/15', text: 'text-shazam-400', ring: 'ring-shazam-500/30' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  { bg: 'bg-violet-500/15', text: 'text-violet-400', ring: 'ring-violet-500/30' },
  { bg: 'bg-sky-500/15', text: 'text-sky-400', ring: 'ring-sky-500/30' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-400', ring: 'ring-cyan-500/30' },
  { bg: 'bg-pink-500/15', text: 'text-pink-400', ring: 'ring-pink-500/30' },
];

const IDLE_COLOR: ColorSet = { bg: 'bg-gray-800', text: 'text-gray-500', ring: 'ring-gray-700/50' };

function agentColor(name: string, idle: boolean): ColorSet {
  if (idle) return IDLE_COLOR;
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AGENT_COLORS[hash % AGENT_COLORS.length] as ColorSet;
}

// Utilization percentage for visual ring
function utilizationPercent(taskCount: number): number {
  if (totalTasks.value === 0) return 0;
  return Math.round((taskCount / totalTasks.value) * 100);
}
</script>

<template>
  <div class="sessions-page">
    <ErrorBoundary :error="error" />
    <LoadingSpinner v-if="isLoading" label="Loading sessions..." />

    <!-- Error Retry -->
    <div v-else-if="!pool && error" class="flex flex-col items-center gap-4 rounded-2xl border border-gray-800 bg-surface-card px-6 py-16 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
        ⚠️
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
      <!-- ─── Page Header ─────────────────────────────────── -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div class="flex items-center gap-2.5 sm:gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-shazam-500/10 text-base ring-1 ring-shazam-500/20 sm:h-10 sm:w-10 sm:text-lg">
              📡
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

      <!-- ─── Stats Row ───────────────────────────────────── -->
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

      <!-- ─── Active Sessions ─────────────────────────────── -->
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
          <div
            v-for="(session, idx) in activeSessions"
            :key="session.key"
            class="session-card group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-surface-card to-gray-900 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
            :style="{ animationDelay: `${idx * 60}ms` }"
          >
            <!-- Active glow -->
            <div class="pointer-events-none absolute inset-0 rounded-2xl opacity-40" style="background: radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 60%)" />

            <div class="relative p-4 sm:p-5">
              <!-- Agent info -->
              <div class="mb-4 flex items-center gap-3">
                <div class="relative flex-shrink-0">
                  <div
                    class="flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold ring-1 transition-transform duration-300 group-hover:scale-105"
                    :class="[agentColor(session.agent_name, false).bg, agentColor(session.agent_name, false).text, agentColor(session.agent_name, false).ring]"
                  >
                    {{ agentInitials(session.agent_name) }}
                  </div>
                  <!-- Pulse ring on active -->
                  <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-surface-card">
                    <span class="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-50" />
                  </span>
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="truncate text-sm font-semibold text-white">{{ session.agent_name }}</h3>
                  <p class="text-xs text-gray-500">Session active</p>
                </div>
                <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>

              <!-- Stats row -->
              <div class="grid grid-cols-3 gap-2">
                <div class="rounded-lg bg-gray-900/60 px-2.5 py-2 text-center">
                  <div class="text-sm font-bold tabular-nums text-white">{{ session.task_count }}</div>
                  <div class="text-[10px] font-medium text-gray-600">Tasks</div>
                </div>
                <div class="rounded-lg bg-gray-900/60 px-2.5 py-2 text-center">
                  <div class="text-sm font-bold tabular-nums text-emerald-400">{{ formatIdleShort(session.last_used) }}</div>
                  <div class="text-[10px] font-medium text-gray-600">Uptime</div>
                </div>
                <div class="rounded-lg bg-gray-900/60 px-2.5 py-2 text-center">
                  <div class="text-sm font-bold tabular-nums text-shazam-400">{{ utilizationPercent(session.task_count) }}%</div>
                  <div class="text-[10px] font-medium text-gray-600">Share</div>
                </div>
              </div>

              <!-- Activity bar -->
              <div class="mt-3">
                <div class="h-1 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-progress-fill"
                    :style="{ width: `${Math.max(utilizationPercent(session.task_count), 8)}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Idle Sessions ───────────────────────────────── -->
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
            <div
              v-for="(session, idx) in idleSessions"
              :key="session.key"
              class="idle-row flex flex-col gap-2 px-4 py-3.5 transition-colors duration-200 hover:bg-gray-800/20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4"
              :style="{ animationDelay: `${(activeSessions.length + idx) * 40}ms` }"
            >
              <!-- Left: avatar + info -->
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ring-1"
                  :class="[agentColor(session.agent_name, true).bg, agentColor(session.agent_name, true).text, agentColor(session.agent_name, true).ring]"
                >
                  {{ agentInitials(session.agent_name) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-gray-300">{{ session.agent_name }}</p>
                  <p class="text-[10px] text-gray-600">
                    {{ session.task_count }} task{{ session.task_count !== 1 ? 's' : '' }} completed
                  </p>
                </div>
              </div>

              <!-- Right: idle time + badge -->
              <div class="flex items-center justify-between gap-3 pl-12 sm:justify-end sm:gap-4 sm:pl-0">
                <div class="text-left sm:text-right">
                  <p class="micro-label">Last active</p>
                  <p class="text-xs font-medium tabular-nums text-gray-400">{{ formatIdleTime(session.last_used) }}</p>
                </div>
                <span class="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-700/40 bg-gray-800/50 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
                  <span class="h-1.5 w-1.5 rounded-full bg-gray-600" />
                  Idle
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Pool Health ─────────────────────────────────── -->
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

.session-card {
  animation: cardFadeIn 0.4s ease-out both;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.idle-row {
  animation: rowSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes rowSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
