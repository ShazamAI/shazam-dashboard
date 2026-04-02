<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboard } from '@/composables/useDashboard';
import { useHealth } from '@/composables/useHealth';
import StatusBar from '@/components/features/StatusBar.vue';
import EventFeed from '@/components/features/EventFeed.vue';
import TaskOverview from '@/components/features/TaskOverview.vue';
import AgentList from '@/components/features/AgentList.vue';
import RecentTasks from '@/components/features/RecentTasks.vue';
import TaskDetailPanel from '@/components/features/TaskDetailPanel.vue';
import HealthIndicators from '@/components/features/HealthIndicators.vue';
import QuickActions from '@/components/features/QuickActions.vue';
import PipelineOverview from '@/components/features/PipelineOverview.vue';
import ActivityTimeline from '@/components/features/ActivityTimeline.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import TaskCreateForm from '@/components/features/TaskCreateForm.vue';
import type { Task } from '@/types';

const router = useRouter();

const {
  isLoading, hasError, isPaused, tasks, agents,
  activeCompany, taskStats, recentTasks, totalCost,
  feed, ws,
  handleStart, handleStop, handleResume, handleApproveAll,
  showCreateTask, isCreatingTask, createTaskForm,
  openCreateTask, closeCreateTask, handleCreateTask,
  complexityWarning, forceCreateTask, createWithDecomposition,
} = useDashboard();

const { health, formattedUptime, fetchHealth, resetCircuitBreaker } = useHealth();

// ─── Navigation ──────────────────────────────────────
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
  router.push({ name: 'Tasks', query: { task: taskId, action } });
}

// ─── Lifecycle ──────────────────────────────────────
function onEscKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && showCreateTask.value) closeCreateTask();
}

onMounted(() => {
  fetchHealth();
  document.addEventListener('keydown', onEscKey);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onEscKey);
});
</script>

<template>
  <div class="dashboard-page space-y-3 sm:space-y-4 md:space-y-5">
    <LoadingSpinner v-if="isLoading" label="Loading dashboard..." prominent />

    <template v-else>
      <!-- Error Banner -->
      <ErrorBoundary :error="hasError ? 'Unable to connect to backend — some data may be unavailable. The dashboard will retry automatically.' : null" />

      <!-- Health Indicators -->
      <HealthIndicators
        :health="health"
        :formatted-uptime="formattedUptime"
        @reset-circuit-breaker="resetCircuitBreaker"
      />

      <!-- Status Bar -->
      <StatusBar
        :company="activeCompany"
        :tasks="tasks"
        :total-cost="totalCost"
        :is-connected="ws.isConnected.value"
        :is-paused="isPaused"
        @start="handleStart"
        @stop="handleStop"
        @resume="handleResume"
        @approve-all="handleApproveAll"
      />

      <!-- Quick Actions -->
      <QuickActions
        :is-paused="isPaused"
        :awaiting-count="taskStats.awaiting"
        @create-task="openCreateTask"
        @approve-all="handleApproveAll"
        @pause="handleStop"
        @resume="handleResume"
      />

      <!-- Pipeline Overview -->
      <PipelineOverview :tasks="tasks" />

      <!-- Main Grid: Event Feed (2/3) + Sidebar (1/3) -->
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

          <!-- Activity Timeline -->
          <ActivityTimeline :items="feed.feedItems.value" />
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

    <!-- Create Task Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateTask" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeCreateTask" />

          <!-- Modal -->
          <div class="relative w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
            <TaskCreateForm
              :create-form="createTaskForm"
              :is-creating="isCreatingTask"
              :company-name="activeCompany?.name ?? null"
              :agents="agents"
              :complexity-warning="complexityWarning"
              @submit="handleCreateTask"
              @cancel="closeCreateTask"
              @force-create="forceCreateTask"
              @decompose="createWithDecomposition"
            />
          </div>
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

/* Create Task modal transitions */
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-enter-from > div:last-child { transform: scale(0.95) translateY(10px); }
.modal-leave-to { opacity: 0; }
</style>
