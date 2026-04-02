<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useAgents } from '@/composables/useAgents';
import { useAgentFilters } from '@/composables/useAgentFilters';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/Button.vue';
import AgentCard from '@/components/features/AgentCard.vue';
import AgentStatsBar from '@/components/features/AgentStatsBar.vue';
import AgentEditForm from '@/components/features/AgentEditForm.vue';
import WorkspaceTabs from '@/components/features/WorkspaceTabs.vue';

const {
  agents,
  isLoading,
  error,
  isSubmitting,
  showCreateForm,
  showEditForm,
  formData,
  getSparkline,
  openCreateForm,
  openEditForm,
  closeForm,
  toggleTool,
  handleCreateAgent,
  handleUpdateAgent,
} = useAgents();

const {
  activeWorkspace,
  searchQuery,
  statusFilter,
  workspaceTabs,
  filteredAgents,
  stats,
  groupedAgents,
  selectWorkspace,
  clearFilters,
} = useAgentFilters(agents);

const isFormOpen = computed(() => showCreateForm.value || !!showEditForm.value);

function handleFormSubmit() {
  if (showEditForm.value) {
    handleUpdateAgent();
  } else {
    handleCreateAgent();
  }
}

function handleEscKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFormOpen.value) {
    closeForm();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscKey);
});
</script>

<template>
  <div class="agents-page">
    <ErrorBoundary :error="error" />

    <!-- Page Header -->
    <div class="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="flex items-center gap-2.5 sm:gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-shazam-500/15 text-base ring-1 ring-shazam-500/30 sm:h-10 sm:w-10 sm:text-lg">
            🤖
          </div>
          <div>
            <h1 class="page-title">Agent Fleet</h1>
            <p class="page-subtitle">Manage and monitor your autonomous workforce</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <AppButton variant="primary" size="sm" @click="openCreateForm">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Deploy Agent
        </AppButton>
      </div>
    </div>

    <!-- Live Stats Bar -->
    <AgentStatsBar :stats="stats" />

    <!-- Workspace Tabs + Search/Filter -->
    <div class="mb-4 space-y-3 sm:mb-6 sm:space-y-4">
      <WorkspaceTabs
        :tabs="workspaceTabs"
        :active-tab="activeWorkspace"
        @select="selectWorkspace"
      />

      <div class="flex flex-col gap-3 sm:flex-row">
        <!-- Search -->
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search agents by name, role, domain..."
            aria-label="Search agents"
            class="w-full rounded-xl border border-gray-800 bg-gray-900/50 py-2.5 pl-10 pr-4 text-sm text-gray-300 placeholder-gray-600 transition-colors focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
          />
        </div>

        <!-- Status filter -->
        <select
          v-model="statusFilter"
          class="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-2.5 text-sm text-gray-300 transition-colors focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
        >
          <option value="all">All Statuses</option>
          <option value="idle">Idle</option>
          <option value="busy">Busy</option>
          <option value="working">Working</option>
          <option value="executing">Executing</option>
          <option value="waiting">Waiting</option>
          <option value="paused">Paused</option>
          <option value="error">Error</option>
          <option value="offline">Offline</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="isLoading" label="Scanning agent fleet..." />

    <!-- Empty -->
    <EmptyState
      v-else-if="agents.length === 0"
      title="No agents deployed"
      description="Deploy your first agent to start building autonomously."
    >
      <template #action>
        <AppButton variant="primary" @click="openCreateForm">Deploy Agent</AppButton>
      </template>
    </EmptyState>

    <!-- No results -->
    <EmptyState
      v-else-if="filteredAgents.length === 0"
      title="No matching agents"
      description="Try adjusting your filters or search query."
    >
      <template #action>
        <AppButton variant="ghost" @click="clearFilters">
          Clear Filters
        </AppButton>
      </template>
    </EmptyState>

    <!-- Agent Groups -->
    <div v-else class="space-y-8">
      <div
        v-for="group in groupedAgents"
        :key="group.id"
        class="workspace-group"
      >
        <!-- Group header -->
        <div v-if="activeWorkspace === 'all'" class="mb-4 flex items-center gap-3">
          <span class="text-lg">{{ group.icon }}</span>
          <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400">
            {{ group.label }}
          </h2>
          <span class="rounded-full bg-gray-800 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
            {{ group.agents.length }}
          </span>
          <div class="h-px flex-1 bg-gradient-to-r from-gray-800 to-transparent" />
        </div>

        <!-- Agent cards grid -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AgentCard
            v-for="agent in group.agents"
            :key="agent.name"
            :agent="agent"
            :sparkline="getSparkline(agent.name)"
            :style="{ animationDelay: `${group.agents.indexOf(agent) * 60}ms` }"
            @edit="openEditForm"
          />
        </div>
      </div>
    </div>

    <!-- Create/Edit Agent Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="isFormOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @keydown.escape="closeForm"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/70 backdrop-blur-sm"
            @click="closeForm"
          />

          <!-- Modal content -->
          <div class="modal-content relative max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-700/50 bg-gray-900 shadow-2xl shadow-black/50 sm:max-h-[85vh]">
            <!-- Modal header -->
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
              <div>
                <h2 class="section-title font-bold">
                  {{ showEditForm ? 'Configure Agent' : 'Deploy New Agent' }}
                </h2>
                <p v-if="showEditForm" class="section-subtitle mt-0.5">{{ showEditForm }}</p>
              </div>
              <button
                class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-800 hover:text-white active:bg-gray-700"
                aria-label="Close"
                @click="closeForm"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <AgentEditForm
              :form-data="formData"
              :agents="agents"
              :is-editing="!!showEditForm"
              :is-submitting="isSubmitting"
              @submit="handleFormSubmit"
              @cancel="closeForm"
              @update:form-data="Object.assign(formData, $event)"
              @toggle-tool="toggleTool"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Workspace group entrance */
.workspace-group {
  animation: groupSlideIn 0.4s ease-out both;
}

.workspace-group:nth-child(2) { animation-delay: 100ms; }
.workspace-group:nth-child(3) { animation-delay: 200ms; }
.workspace-group:nth-child(4) { animation-delay: 300ms; }

@keyframes groupSlideIn {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Modal transitions */
.modal-enter-active {
  transition: all 0.3s ease-out;
}

.modal-leave-active {
  transition: all 0.2s ease-in;
}

.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.modal-leave-to .modal-content {
  transform: scale(0.98) translateY(5px);
  opacity: 0;
}

.modal-content {
  transition: all 0.3s ease-out;
}
</style>
