<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboard } from '@/composables/useDashboard';
import StatusBar from '@/components/features/StatusBar.vue';
import EventFeed from '@/components/features/EventFeed.vue';
import TaskOverview from '@/components/features/TaskOverview.vue';
import AgentList from '@/components/features/AgentList.vue';
import RecentTasks from '@/components/features/RecentTasks.vue';
import TaskDetailPanel from '@/components/features/TaskDetailPanel.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { get, post } from '@/api/http';
import type { Task } from '@/types';

const router = useRouter();

const {
  isLoading, hasError, isPaused, tasks,
  activeCompany, taskStats, recentTasks,
  feed, ws,
  handleStart, handleStop, handleResume, handleApproveAll,
} = useDashboard();

function navigateToAgent(name: string) {
  router.push({ name: 'Agents', query: { agent: name } });
}

function navigateToTasks() {
  router.push({ name: 'Tasks' });
}

function filterByStatus(status: string) {
  router.push({ name: 'Tasks', query: { status } });
}

// ─── Task Detail Panel ──────────────────────────────
const selectedTask = ref<Task | null>(null);
const dashboardActionLoading = ref<Record<string, string>>({});

function selectTask(task: Task) {
  selectedTask.value = task;
}

function closeDashboardDetail() {
  selectedTask.value = null;
}

function handleDashboardTaskAction(taskId: string, action: string) {
  // Navigate to tasks page for full action handling
  router.push({ name: 'Tasks', query: { task: taskId, action } });
}

// ─── Health Indicators ──────────────────────────────
interface HealthData {
  memory_mb: number;
  uptime_seconds: number;
  active_sessions: number;
  circuit_breaker_tripped: boolean;
}

const health = ref<HealthData | null>(null);
const healthLoading = ref(true);

async function resetCircuitBreaker() {
  try {
    await post('/ralph-loop/reset-circuit-breaker', {});
    if (health.value) health.value.circuit_breaker_tripped = false;
  } catch { /* ignore */ }
}

async function fetchHealth() {
  try {
    const data = await get<Record<string, unknown>>('/health');
    health.value = {
      memory_mb: (data.memory_mb as number) ?? 0,
      uptime_seconds: (data.uptime_seconds as number) ?? 0,
      active_sessions: (data.active_sessions as number) ?? (data.sessions ? Object.keys(data.sessions as object).length : 0),
      circuit_breaker_tripped: (data.circuit_breaker_tripped as boolean) ?? false,
    };
  } catch {
    health.value = null;
  } finally {
    healthLoading.value = false;
  }
}

const formattedUptime = computed(() => {
  if (!health.value) return '--';
  const s = health.value.uptime_seconds;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
});

// ─── Pipeline Overview ──────────────────────────────
const pipelineStages = computed(() => {
  const stages: Record<string, number> = {};
  for (const task of tasks.value) {
    if (task.pipeline && Array.isArray(task.pipeline)) {
      for (const stage of task.pipeline) {
        const name = stage.name ?? 'unknown';
        if (!stages[name]) stages[name] = 0;
        if (stage.status === 'in_progress') stages[name]++;
      }
    }
    // Also count by task status as pipeline stages
    const statusStage = task.status.replace('_', ' ');
    if (!stages[statusStage]) stages[statusStage] = 0;
    stages[statusStage]++;
  }
  return stages;
});

const pipelineTotal = computed(() => {
  return Object.values(pipelineStages.value).reduce((sum, n) => sum + n, 0);
});

const pipelineStageColors: Record<string, string> = {
  'pending': 'bg-gray-500',
  'in progress': 'bg-shazam-500',
  'completed': 'bg-emerald-500',
  'failed': 'bg-red-500',
  'awaiting approval': 'bg-yellow-500',
  'paused': 'bg-purple-500',
};

function getStageColor(name: string): string {
  return pipelineStageColors[name] ?? 'bg-blue-500';
}

function getStagePercent(count: number): number {
  if (pipelineTotal.value === 0) return 0;
  return (count / pipelineTotal.value) * 100;
}

// ─── Activity Timeline ──────────────────────────────
const activityTimeline = computed(() => {
  const items = feed.feedItems.value;
  return [...items]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      type: item.type,
      agent: item.agent,
      content: item.content,
      timestamp: item.timestamp,
    }));
});

function formatTimelineTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--';
  }
}

function getTimelineColor(type: string | undefined | null): string {
  const t = type ?? '';
  if (t.includes('failed') || t.includes('error') || t === 'circuit_breaker_tripped') return 'bg-red-500';
  if (t.includes('completed') || t === 'circuit_breaker_reset') return 'bg-emerald-500';
  if (t.includes('started') || t.includes('created')) return 'bg-shazam-500';
  if (t.includes('tool')) return 'bg-purple-500';
  if (t.includes('agent')) return 'bg-blue-500';
  return 'bg-gray-500';
}

function getTimelineDotBorder(type: string | undefined | null): string {
  const t = type ?? '';
  if (t.includes('failed') || t.includes('error') || t === 'circuit_breaker_tripped') return 'ring-red-500/20';
  if (t.includes('completed') || t === 'circuit_breaker_reset') return 'ring-emerald-500/20';
  if (t.includes('started') || t.includes('created')) return 'ring-shazam-500/20';
  return 'ring-gray-500/20';
}

// ─── Quick Actions ──────────────────────────────────
function handleCreateTask() {
  router.push({ name: 'Tasks', query: { create: '1' } });
}

// ─── Lifecycle ──────────────────────────────────────
onMounted(() => {
  fetchHealth();
});
</script>

<template>
  <div class="dashboard-page space-y-3 sm:space-y-4 md:space-y-5">
    <LoadingSpinner v-if="isLoading" label="Loading dashboard..." prominent />

    <template v-else>
      <!-- Error Banner -->
      <Transition
        enter-active-class="transition-all duration-350 ease-bounce-in"
        enter-from-class="opacity-0 -translate-y-2"
        leave-active-class="transition-all duration-200"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="hasError"
          class="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3"
        >
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-500/15">
            <svg class="h-4 w-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-yellow-300">Unable to connect to backend</p>
            <p class="mt-0.5 text-xs text-yellow-400/60">
              Some data may be unavailable. The dashboard will retry automatically.
            </p>
          </div>
        </div>
      </Transition>

      <!-- ============================================= -->
      <!-- NEW: Health Indicators Bar                    -->
      <!-- ============================================= -->
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <!-- Memory -->
        <div class="rounded-2xl border border-gray-800 bg-surface-card px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-500">Memory</p>
              <p class="text-sm font-semibold text-white">
                {{ health ? `${health.memory_mb.toFixed(0)} MB` : '--' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Uptime -->
        <div class="rounded-2xl border border-gray-800 bg-surface-card px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <svg class="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-500">Uptime</p>
              <p class="text-sm font-semibold text-white">{{ formattedUptime }}</p>
            </div>
          </div>
        </div>

        <!-- Active Sessions -->
        <div class="rounded-2xl border border-gray-800 bg-surface-card px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-shazam-500/10">
              <svg class="h-4 w-4 text-shazam-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wider text-gray-500">Sessions</p>
              <p class="text-sm font-semibold text-white">
                {{ health ? health.active_sessions : '--' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Circuit Breaker -->
        <div class="rounded-2xl border bg-surface-card px-4 py-3"
          :class="health?.circuit_breaker_tripped ? 'border-red-500/40' : 'border-gray-800'"
        >
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg"
              :class="health?.circuit_breaker_tripped ? 'bg-red-500/15' : 'bg-gray-700/40'"
            >
              <svg
                class="h-4 w-4"
                :class="health?.circuit_breaker_tripped ? 'text-red-400' : 'text-gray-500'"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-[10px] uppercase tracking-wider text-gray-500">Circuit Breaker</p>
              <p class="text-sm font-semibold" :class="health?.circuit_breaker_tripped ? 'text-red-400' : 'text-emerald-400'">
                {{ health ? (health.circuit_breaker_tripped ? 'TRIPPED' : 'OK') : '--' }}
              </p>
            </div>
            <button
              class="rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors"
              :class="health?.circuit_breaker_tripped
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'bg-gray-700/40 text-gray-500 hover:bg-gray-700/60 hover:text-gray-300'"
              @click="resetCircuitBreaker"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Status Bar (existing) -->
      <StatusBar
        :company="activeCompany"
        :tasks="tasks"
        :total-cost="feed.totalCost.value"
        :is-connected="ws.isConnected.value"
        :is-paused="isPaused"
        @start="handleStart"
        @stop="handleStop"
        @resume="handleResume"
        @approve-all="handleApproveAll"
      />

      <!-- ============================================= -->
      <!-- NEW: Quick Actions Row                        -->
      <!-- ============================================= -->
      <div class="flex flex-wrap gap-2">
        <button
          class="inline-flex items-center gap-2 rounded-xl border border-shazam-500/30 bg-shazam-500/10 px-4 py-2 text-xs font-medium text-shazam-400 transition-all hover:bg-shazam-500/20 hover:border-shazam-500/50"
          @click="handleCreateTask"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Task
        </button>

        <button
          class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50"
          :class="{ 'opacity-50 cursor-not-allowed': taskStats.awaiting === 0 }"
          :disabled="taskStats.awaiting === 0"
          @click="handleApproveAll"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Approve All
          <span v-if="taskStats.awaiting > 0" class="rounded-full bg-emerald-500/20 px-1.5 text-[10px]">{{ taskStats.awaiting }}</span>
        </button>

        <button
          v-if="!isPaused"
          class="inline-flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-medium text-yellow-400 transition-all hover:bg-yellow-500/20 hover:border-yellow-500/50"
          @click="handleStop"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
          Pause Loop
        </button>

        <button
          v-else
          class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50"
          @click="handleResume"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
          Resume
        </button>
      </div>

      <!-- ============================================= -->
      <!-- NEW: Pipeline Overview                        -->
      <!-- ============================================= -->
      <div v-if="tasks.length > 0" class="rounded-2xl border border-gray-800 bg-surface-card p-4">
        <h3 class="mb-3 text-sm font-semibold text-white">Pipeline Overview</h3>

        <!-- Horizontal stacked bar -->
        <div class="mb-3 flex h-4 overflow-hidden rounded-full bg-gray-800">
          <template v-for="(count, stage) in pipelineStages" :key="stage">
            <div
              v-if="count > 0"
              class="transition-all duration-500 ease-out"
              :class="getStageColor(String(stage))"
              :style="{ width: `${getStagePercent(count)}%`, minWidth: count > 0 ? '4px' : '0' }"
              :title="`${stage}: ${count}`"
            />
          </template>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap gap-x-4 gap-y-1.5">
          <template v-for="(count, stage) in pipelineStages" :key="stage">
            <div v-if="count > 0" class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full" :class="getStageColor(String(stage))" />
              <span class="text-[11px] text-gray-400 capitalize">{{ stage }}</span>
              <span class="text-[11px] font-medium text-gray-300">{{ count }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Main Grid: Event Feed (2/3) + Sidebar (1/3) (existing) -->
      <div class="grid gap-3 sm:gap-4 md:gap-5 lg:grid-cols-3">
        <!-- Live Event Feed -->
        <div class="lg:col-span-2">
          <EventFeed :items="feed.feedItems.value" />
        </div>

        <!-- Right sidebar -->
        <div class="sidebar-panel space-y-3 sm:space-y-4">
          <TaskOverview v-bind="taskStats" />

          <AgentList
            v-if="activeCompany"
            :agents="activeCompany.agents"
            @select="navigateToAgent"
          />

          <RecentTasks
            :tasks="recentTasks"
            @view-all="navigateToTasks"
            @filter-by-status="filterByStatus"
            @select-task="selectTask"
          />

          <!-- ============================================= -->
          <!-- NEW: Activity Timeline                        -->
          <!-- ============================================= -->
          <div class="rounded-2xl border border-gray-800 bg-surface-card p-4">
            <h3 class="mb-3 text-sm font-semibold text-white">Activity Timeline</h3>

            <div v-if="activityTimeline.length === 0" class="py-4 text-center text-xs text-gray-600">
              No recent activity
            </div>

            <div v-else class="relative space-y-0">
              <!-- Timeline line -->
              <div class="absolute left-[11px] top-2 bottom-2 w-px bg-gray-800" />

              <div
                v-for="(event, idx) in activityTimeline"
                :key="event.id"
                class="relative flex gap-3 pb-3"
                :class="{ 'pb-0': idx === activityTimeline.length - 1 }"
              >
                <!-- Dot -->
                <div
                  class="relative z-10 mt-1 h-[9px] w-[9px] shrink-0 rounded-full ring-2"
                  :class="[getTimelineColor(event.type), getTimelineDotBorder(event.type)]"
                  style="margin-left: 4.5px;"
                />

                <div class="min-w-0 flex-1 -mt-0.5">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-gray-600">{{ formatTimelineTime(event.timestamp) }}</span>
                    <span
                      v-if="event.agent"
                      class="truncate rounded bg-gray-800/80 px-1.5 py-0.5 text-[10px] text-gray-400"
                    >
                      {{ event.agent }}
                    </span>
                    <span class="rounded bg-gray-800/50 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {{ (event.type ?? '').replace(/_/g, ' ') }}
                    </span>
                  </div>
                  <p class="mt-0.5 truncate text-[11px] text-gray-400">{{ event.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Task Detail Panel (overlay) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-200"
        leave-to-class="opacity-0"
      >
        <div v-if="selectedTask" class="fixed inset-0 z-50 flex items-start justify-end bg-black/40 p-4 pt-16" @click.self="closeDashboardDetail">
          <TaskDetailPanel
            :task="selectedTask"
            :action-loading="dashboardActionLoading"
            @close="closeDashboardDetail"
            @navigate-agent="navigateToAgent"
            @action="handleDashboardTaskAction"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Staggered sidebar panel entrance */
.sidebar-panel > :nth-child(1) { animation: panelIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 100ms backwards; }
.sidebar-panel > :nth-child(2) { animation: panelIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 200ms backwards; }
.sidebar-panel > :nth-child(3) { animation: panelIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 300ms backwards; }
.sidebar-panel > :nth-child(4) { animation: panelIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 400ms backwards; }

@keyframes panelIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
