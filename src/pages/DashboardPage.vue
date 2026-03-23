<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useDashboard } from '@/composables/useDashboard';
import StatusBar from '@/components/features/StatusBar.vue';
import EventFeed from '@/components/features/EventFeed.vue';
import TaskOverview from '@/components/features/TaskOverview.vue';
import AgentList from '@/components/features/AgentList.vue';
import RecentTasks from '@/components/features/RecentTasks.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

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

      <!-- Status Bar -->
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
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Staggered sidebar panel entrance */
.sidebar-panel > :nth-child(1) { animation: panelIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 100ms backwards; }
.sidebar-panel > :nth-child(2) { animation: panelIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 200ms backwards; }
.sidebar-panel > :nth-child(3) { animation: panelIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 300ms backwards; }

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
