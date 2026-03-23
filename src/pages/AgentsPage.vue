<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAgents } from '@/composables/useAgents';
import {
  AVAILABLE_TOOLS,
  AVAILABLE_PROVIDERS,
} from '@/api/agentService';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/Button.vue';
import AgentCard from '@/components/features/AgentCard.vue';
import WorkspaceTabs from '@/components/features/WorkspaceTabs.vue';
import type { WorkspaceTab } from '@/components/features/WorkspaceTabs.vue';
import type { AgentWorker } from '@/types';
import { AGENT_ROLE_PRESETS } from '@/types';

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

// ─── Workspace Filtering ─────────────────────────────────

const activeWorkspace = ref('all');
const searchQuery = ref('');
const statusFilter = ref<string>('all');

function inferWorkspace(agent: AgentWorker): string {
  const d = (agent.domain ?? '').toLowerCase();
  if (d.includes('dashboard') || d.includes('frontend')) return 'dashboard';
  if (d.includes('vscode') || d.includes('extension')) return 'vscode';
  if (d.includes('backend') || d.includes('api')) return 'backend';
  return 'general';
}

const workspaceTabs = computed<WorkspaceTab[]>(() => {
  const counts: Record<string, number> = {};
  for (const agent of agents.value) {
    const ws = inferWorkspace(agent);
    counts[ws] = (counts[ws] ?? 0) + 1;
  }

  const defs: Array<{ id: string; label: string; icon: string; color: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'bg-violet-500/10 text-violet-400' },
    { id: 'vscode', label: 'VS Code', icon: '💻', color: 'bg-sky-500/10 text-sky-400' },
    { id: 'backend', label: 'Backend', icon: '⚙️', color: 'bg-emerald-500/10 text-emerald-400' },
    { id: 'general', label: 'General', icon: '🔮', color: 'bg-gray-500/10 text-gray-400' },
  ];

  return defs
    .filter(d => (counts[d.id] ?? 0) > 0)
    .map(d => ({ ...d, count: counts[d.id] ?? 0 }));
});

const filteredAgents = computed(() => {
  let result = agents.value;

  // Workspace filter
  if (activeWorkspace.value !== 'all') {
    result = result.filter(a => inferWorkspace(a) === activeWorkspace.value);
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(a => a.status === statusFilter.value);
  }

  // Search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      (a.domain ?? '').toLowerCase().includes(q) ||
      (a.supervisor ?? '').toLowerCase().includes(q)
    );
  }

  return result;
});

// ─── Stats ────────────────────────────────────────────────

const stats = computed(() => {
  const all = agents.value;
  return {
    total: all.length,
    active: all.filter(a => ['busy', 'working', 'executing'].includes(a.status)).length,
    idle: all.filter(a => a.status === 'idle').length,
    offline: all.filter(a => a.status === 'offline').length,
    errors: all.filter(a => a.status === 'error').length,
  };
});

// ─── Grouped agents ───────────────────────────────────────

interface WorkspaceGroup {
  id: string;
  label: string;
  icon: string;
  agents: AgentWorker[];
}

const groupedAgents = computed<WorkspaceGroup[]>(() => {
  if (activeWorkspace.value !== 'all') {
    return [{
      id: activeWorkspace.value,
      label: workspaceTabs.value.find(t => t.id === activeWorkspace.value)?.label ?? activeWorkspace.value,
      icon: workspaceTabs.value.find(t => t.id === activeWorkspace.value)?.icon ?? '📦',
      agents: filteredAgents.value,
    }];
  }

  const groups: Record<string, AgentWorker[]> = {};
  for (const agent of filteredAgents.value) {
    const ws = inferWorkspace(agent);
    if (!groups[ws]) groups[ws] = [];
    groups[ws].push(agent);
  }

  const order = ['dashboard', 'vscode', 'backend', 'general'];
  const labels: Record<string, { label: string; icon: string }> = {
    dashboard: { label: 'Dashboard Team', icon: '📊' },
    vscode: { label: 'VS Code Team', icon: '💻' },
    backend: { label: 'Backend Team', icon: '⚙️' },
    general: { label: 'General', icon: '🔮' },
  };

  return order
    .filter(id => groups[id]?.length)
    .map(id => ({
      id,
      label: labels[id]?.label ?? id,
      icon: labels[id]?.icon ?? '📦',
      agents: groups[id] ?? [],
    }));
});

function selectWorkspace(tabId: string) {
  activeWorkspace.value = tabId;
}
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
    <div class="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-5 sm:gap-3">
      <div class="stats-card rounded-xl border border-gray-800/60 bg-gradient-to-br from-surface-card to-gray-900 p-3 sm:p-4">
        <div class="text-xl font-bold tabular-nums text-white sm:text-2xl">{{ stats.total }}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stats-card rounded-xl border border-shazam-500/20 bg-gradient-to-br from-shazam-500/5 to-surface-card p-3 sm:p-4">
        <div class="flex items-center gap-2">
          <div class="text-xl font-bold tabular-nums text-shazam-400 sm:text-2xl">{{ stats.active }}</div>
          <span v-if="stats.active > 0" class="h-2 w-2 animate-pulse rounded-full bg-shazam-400" />
        </div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stats-card rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-surface-card p-3 sm:p-4">
        <div class="text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">{{ stats.idle }}</div>
        <div class="stat-label">Idle</div>
      </div>
      <div class="stats-card rounded-xl border border-gray-700/60 bg-gradient-to-br from-surface-card to-gray-900 p-3 sm:p-4">
        <div class="text-xl font-bold tabular-nums text-gray-500 sm:text-2xl">{{ stats.offline }}</div>
        <div class="stat-label">Offline</div>
      </div>
      <div class="stats-card rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-surface-card p-3 sm:p-4">
        <div class="text-xl font-bold tabular-nums text-red-400 sm:text-2xl">{{ stats.errors }}</div>
        <div class="stat-label">Errors</div>
      </div>
    </div>

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
        <AppButton variant="ghost" @click="searchQuery = ''; statusFilter = 'all'; activeWorkspace = 'all'">
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
          v-if="showCreateForm || showEditForm"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @keydown.escape="closeForm"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/70 backdrop-blur-sm"
            @click="closeForm"
          />

          <!-- Modal content — full-screen on mobile, centered on desktop -->
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

            <form class="space-y-4 p-4 sm:space-y-5 sm:p-6" @submit.prevent="showEditForm ? handleUpdateAgent() : handleCreateAgent()">
              <!-- Name + Role row -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="form-label">Name *</label>
                  <input
                    v-model="formData.name"
                    type="text"
                    :disabled="!!showEditForm"
                    placeholder="e.g., senior_dev_1"
                    class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label class="form-label">Role *</label>
                  <select
                    v-model="formData.role"
                    class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                  >
                    <option v-for="preset in AGENT_ROLE_PRESETS" :key="preset" :value="preset">{{ preset }}</option>
                    <option value="custom">Custom Role</option>
                  </select>
                </div>
              </div>

              <!-- Supervisor -->
              <div>
                <label class="form-label">Supervisor</label>
                <select
                  v-model="formData.supervisor"
                  class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                >
                  <option :value="null">None</option>
                  <option
                    v-for="a in agents.filter(a => a.name !== formData.name)"
                    :key="a.name"
                    :value="a.name"
                  >
                    {{ a.name }} ({{ a.role }})
                  </option>
                </select>
              </div>

              <!-- Model + Provider row -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="form-label">Model</label>
                  <input
                    v-model="formData.model"
                    type="text"
                    placeholder="e.g., claude-sonnet-4-20250514"
                    class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                  />
                </div>

                <div>
                  <label class="form-label">Provider</label>
                  <select
                    v-model="formData.provider"
                    class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                  >
                    <option :value="null">Default</option>
                    <option v-for="p in AVAILABLE_PROVIDERS" :key="p" :value="p">{{ p }}</option>
                  </select>
                </div>
              </div>

              <!-- Budget + Domain row -->
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="form-label">Token Budget</label>
                  <input
                    v-model.number="formData.budget"
                    type="number"
                    min="0"
                    step="10000"
                    class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                  />
                </div>

                <div>
                  <label class="form-label">Domain</label>
                  <input
                    v-model="formData.domain"
                    type="text"
                    placeholder="e.g., frontend, backend"
                    class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                  />
                </div>
              </div>

              <!-- Modules -->
              <div>
                <label class="form-label">Modules (comma-separated)</label>
                <input
                  :value="formData.modules?.join(', ') ?? ''"
                  type="text"
                  placeholder="e.g., src/components/, src/pages/"
                  class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                  @input="formData.modules = ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean)"
                />
              </div>

              <!-- Tools -->
              <div>
                <label class="form-label">Tools</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="tool in AVAILABLE_TOOLS"
                    :key="tool"
                    type="button"
                    class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200"
                    :class="
                      formData.tools?.includes(tool)
                        ? 'border-shazam-500/50 bg-shazam-500/15 text-shazam-400 shadow-sm shadow-shazam-500/10'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    "
                    @click="toggleTool(tool)"
                  >
                    {{ tool }}
                  </button>
                </div>
              </div>

              <!-- System Prompt -->
              <div>
                <label class="form-label">System Prompt</label>
                <textarea
                  v-model="formData.system_prompt"
                  rows="3"
                  placeholder="Custom instructions for this agent..."
                  class="form-input w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 transition focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                />
              </div>

              <!-- Actions -->
              <div class="flex gap-3 border-t border-gray-800 pt-5">
                <AppButton
                  variant="primary"
                  type="submit"
                  :loading="isSubmitting"
                  :disabled="isSubmitting || !formData.name.trim()"
                >
                  {{ showEditForm ? 'Update Agent' : 'Deploy Agent' }}
                </AppButton>
                <AppButton variant="ghost" type="button" @click="closeForm">
                  Cancel
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Stats cards stagger entrance */
.stats-card {
  animation: statsFadeIn 0.5s ease-out both;
}

.stats-card:nth-child(1) { animation-delay: 0ms; }
.stats-card:nth-child(2) { animation-delay: 60ms; }
.stats-card:nth-child(3) { animation-delay: 120ms; }
.stats-card:nth-child(4) { animation-delay: 180ms; }
.stats-card:nth-child(5) { animation-delay: 240ms; }

@keyframes statsFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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
