<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { approveTask, rejectTask, pauseTask, resumeTask, retryTask, deleteTask } from '@/api/taskService';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useAgentStore } from '@/stores/agents';
import { useWebSocket } from '@/composables/useWebSocket';
import { useToast } from '@/composables/useToast';
import { useTaskPagination, STATUS_META } from '@/composables/useTaskPagination';
import { useTaskActions } from '@/composables/useTaskActions';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/Button.vue';
import Pagination from '@/components/common/Pagination.vue';
import TaskTable from '@/components/features/TaskTable.vue';
import TaskDetailPanel from '@/components/features/TaskDetailPanel.vue';
import TaskCreateForm from '@/components/features/TaskCreateForm.vue';

const router = useRouter();
const toast = useToast();
const { activeCompany, loadCompanies } = useActiveCompany();
const { on: onWsEvent } = useWebSocket();

const pagination = useTaskPagination();
const taskActions = useTaskActions({
  onTaskUpdated: pagination.updateTaskInList,
  onTaskRemoved: pagination.removeTaskFromList,
  onReload: pagination.loadTasks,
  toast,
});

// Get agents from the agent store (loaded via API with roles)
const agentStore = useAgentStore();
const allAgents = computed(() => agentStore.agents);

// Wire up WS events
onWsEvent('*', (event) => pagination.handleTaskWsEvent(event));

// Action dispatch: map action name → service function
const ACTION_FNS: Record<string, (id: string) => Promise<unknown>> = {
  approve: approveTask, reject: rejectTask, pause: pauseTask,
  resume: resumeTask, retry: retryTask, delete: deleteTask,
};

function handleAction(taskId: string, action: string) {
  const fn = ACTION_FNS[action];
  if (fn) taskActions.executeAction(taskId, action, fn);
}

function handleCreate() {
  if (activeCompany.value) taskActions.handleCreate(activeCompany.value.name);
}

function navigateToAgent(name: string) {
  router.push({ name: 'Agents', query: { agent: name } });
}

// Status icon map
const STATUS_ICONS: Record<string, string> = {
  pending: '⏳',
  in_progress: '🔄',
  completed: '✅',
  failed: '❌',
  awaiting_approval: '🔔',
  paused: '⏸️',
};

const hasActiveFilters = computed(() =>
  !!pagination.searchQuery.value || !!pagination.statusFilter.value || !!pagination.agentFilter.value
);

onMounted(() => {
  pagination.startLoadingTimeout(() => toast.warning('Loading timed out — backend may be unavailable'));
  pagination.loadTasks().then(() => pagination.clearLoadingTimeout());
  loadCompanies();
});

// Reload tasks when active project changes
watch(
  () => activeCompany.value?.name,
  (name, oldName) => {
    if (name && name !== oldName) {
      pagination.loadTasks({ page: 1 });
    }
  }
);
</script>

<template>
  <div class="tasks-page">
    <!-- Header -->
    <div class="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        <div class="flex items-center gap-2.5 sm:gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-shazam-500/10 text-base ring-1 ring-shazam-500/20 sm:h-10 sm:w-10 sm:text-lg">
            📋
          </div>
          <div>
            <h1 class="page-title">Tasks</h1>
            <p class="page-subtitle">Manage and monitor all agent tasks</p>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <AppButton v-if="pagination.statusCounts.value.awaiting_approval > 0" variant="info" size="sm" @click="taskActions.handleApproveAll">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Approve All ({{ pagination.statusCounts.value.awaiting_approval }})
        </AppButton>
        <AppButton variant="primary" size="sm" @click="taskActions.showCreateForm.value = !taskActions.showCreateForm.value">
          <svg v-if="!taskActions.showCreateForm.value" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ taskActions.showCreateForm.value ? 'Cancel' : 'New Task' }}
        </AppButton>
      </div>
    </div>

    <!-- Create Form -->
    <TaskCreateForm
      v-if="taskActions.showCreateForm.value"
      :create-form="taskActions.createForm.value"
      :is-creating="taskActions.isCreating.value"
      :company-name="activeCompany?.name ?? null"
      :agents="allAgents"
      @submit="handleCreate"
      @cancel="taskActions.resetCreateForm"
    />

    <!-- Status Counts Bar -->
    <div class="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:grid-cols-6 sm:gap-3">
      <button
        v-for="s in STATUS_META"
        :key="s.value"
        class="status-filter-card group relative overflow-hidden rounded-xl border bg-gradient-to-br from-surface-card to-gray-900 p-2.5 text-center transition-all duration-300 sm:p-3"
        :class="pagination.statusFilter.value === s.value
          ? 'border-shazam-500/40 shadow-sm shadow-shazam-500/10'
          : 'border-gray-800/60 hover:border-gray-700'"
        @click="pagination.statusFilter.value = pagination.statusFilter.value === s.value ? '' : s.value"
      >
        <!-- Active indicator -->
        <div
          v-if="pagination.statusFilter.value === s.value"
          class="pointer-events-none absolute inset-0 rounded-xl opacity-30"
          style="background: radial-gradient(circle at 50% 0%, rgba(255, 202, 29, 0.15) 0%, transparent 70%)"
        />

        <div class="relative">
          <span class="text-base sm:hidden">{{ STATUS_ICONS[s.value] ?? '📌' }}</span>
          <p class="text-xl font-bold tabular-nums sm:text-2xl" :class="s.color">
            {{ pagination.statusCounts.value[s.value] }}
          </p>
          <p class="stat-label mt-0.5">{{ s.label }}</p>
        </div>
      </button>
    </div>

    <!-- Search + Agent Filter + Count -->
    <div class="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:gap-3">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          v-model="pagination.searchQuery.value"
          type="text"
          placeholder="Search tasks by title or ID..."
          class="w-full rounded-xl border border-gray-800 bg-gray-900/50 py-2.5 pl-10 pr-4 text-sm text-gray-300 placeholder-gray-600 transition-colors focus:border-shazam-500/50 focus:outline-none focus:ring-1 focus:ring-shazam-500/20"
        />
      </div>
      <select
        v-model="pagination.agentFilter.value"
        class="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-2.5 text-sm text-gray-300 transition-colors focus:border-shazam-500/50 focus:outline-none focus:ring-1 focus:ring-shazam-500/20"
      >
        <option value="">All Agents</option>
        <option v-for="agent in pagination.uniqueAgents.value" :key="agent" :value="agent">{{ agent }}</option>
      </select>

      <!-- Clear filters + count -->
      <div class="flex items-center gap-2">
        <AppButton v-if="hasActiveFilters" variant="ghost" size="sm" @click="pagination.searchQuery.value = ''; pagination.statusFilter.value = ''; pagination.agentFilter.value = ''">
          Clear
        </AppButton>
        <span class="hidden items-center rounded-lg border border-gray-800/60 bg-surface-card px-3 py-1.5 text-xs tabular-nums text-gray-500 sm:flex">
          {{ pagination.paginationInfo.value.total }} task{{ pagination.paginationInfo.value.total !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <!-- Loading / Error / Empty -->
    <LoadingSpinner v-if="pagination.isLoading.value" label="Loading tasks..." />

    <div v-else-if="pagination.error.value && pagination.tasks.value.length === 0" class="flex flex-col items-center gap-4 rounded-2xl border border-gray-800 bg-surface-card px-6 py-16 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">⚠️</div>
      <div>
        <p class="text-sm font-medium text-gray-300">{{ pagination.error.value }}</p>
        <p class="mt-1 text-xs text-gray-500">Check your backend connection and try again.</p>
      </div>
      <AppButton variant="primary" @click="pagination.loadTasks()">Retry</AppButton>
    </div>

    <EmptyState
      v-else-if="pagination.displayTasks.value.length === 0 && !hasActiveFilters"
      title="No tasks yet"
      description="Tasks will appear here when agents start working or you create one."
    >
      <template #action>
        <AppButton variant="primary" @click="taskActions.showCreateForm.value = true">Create First Task</AppButton>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="pagination.displayTasks.value.length === 0"
      title="No matching tasks"
      description="Try adjusting your filters or search query."
    >
      <template #action>
        <AppButton variant="ghost" @click="pagination.searchQuery.value = ''; pagination.statusFilter.value = ''; pagination.agentFilter.value = ''">
          Clear Filters
        </AppButton>
      </template>
    </EmptyState>

    <!-- Main: Table + Detail -->
    <div v-else class="flex gap-4">
      <div class="min-w-0 flex-1" :class="pagination.selectedTask.value ? 'hidden lg:block' : ''">
        <TaskTable
          :tasks="pagination.displayTasks.value"
          :selected-task-id="pagination.selectedTask.value?.id ?? null"
          :is-page-loading="pagination.isPageLoading.value"
          :current-page="pagination.currentPage.value"
          :action-loading="taskActions.actionLoading.value"
          @select="pagination.selectTask"
          @navigate-agent="navigateToAgent"
          @action="handleAction"
        />

        <!-- Pagination -->
        <div v-if="pagination.serverTotal.value > 0" class="mt-4 rounded-xl border border-gray-800/60 bg-surface-card px-3 py-2.5 sm:px-4 sm:py-3">
          <Pagination
            :page="pagination.currentPage.value"
            :total-items="pagination.serverTotal.value"
            :page-size="pagination.pageSize.value"
            :page-size-options="[10, 20, 50]"
            @update:page="pagination.currentPage.value = $event"
            @update:page-size="pagination.pageSize.value = $event"
          />
        </div>
      </div>

      <!-- Detail Panel -->
      <TaskDetailPanel
        v-if="pagination.selectedTask.value"
        :task="pagination.selectedTask.value"
        :action-loading="taskActions.actionLoading.value"
        @close="pagination.selectedTask.value = null"
        @navigate-agent="navigateToAgent"
        @action="handleAction"
      />
    </div>
  </div>
</template>

<style scoped>
.tasks-page {
  animation: pageIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status-filter-card {
  animation: statusCardIn 0.4s ease-out both;
}

.status-filter-card:nth-child(1) { animation-delay: 0ms; }
.status-filter-card:nth-child(2) { animation-delay: 40ms; }
.status-filter-card:nth-child(3) { animation-delay: 80ms; }
.status-filter-card:nth-child(4) { animation-delay: 120ms; }
.status-filter-card:nth-child(5) { animation-delay: 160ms; }
.status-filter-card:nth-child(6) { animation-delay: 200ms; }

@keyframes statusCardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
