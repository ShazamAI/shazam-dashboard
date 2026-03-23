<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useConfigForm } from '@/composables/useConfigForm';
import { useWorkspaces } from '@/composables/useWorkspaces';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import AppButton from '@/components/common/Button.vue';
import ConfigGeneralTab from '@/components/features/ConfigGeneralTab.vue';
import ConfigRalphTab from '@/components/features/ConfigRalphTab.vue';
import ConfigAgentsTab from '@/components/features/ConfigAgentsTab.vue';
import ConfigPluginsTab from '@/components/features/ConfigPluginsTab.vue';
import ConfigTechStackTab from '@/components/features/ConfigTechStackTab.vue';
import ConfigWorkspacesTab from '@/components/features/ConfigWorkspacesTab.vue';

const {
  config, isLoading, error, isFallbackData,
  editableConfig, isSaving, saveSuccess, isReloadingPlugins,
  domainEntries, agentEntries, techStackEntries, plugins,
  loadConfig, saveRalphLoop, handleReloadPlugins,
} = useConfigForm();

const {
  workspaces, isLoading: isLoadingWorkspaces, switchingTo,
  ensureLoaded: ensureWorkspacesLoaded, handleSwitchWorkspace,
} = useWorkspaces();

type TabKey = 'general' | 'ralph' | 'agents' | 'plugins' | 'techstack' | 'workspaces';
const activeTab = ref<TabKey>('general');

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
  description: string;
}

const tabs: TabDef[] = [
  { key: 'general', label: 'General', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25', description: 'Company & Provider' },
  { key: 'ralph', label: 'RalphLoop', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', description: 'Task execution loop' },
  { key: 'agents', label: 'Agents', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', description: 'Agent definitions' },
  { key: 'plugins', label: 'Plugins', icon: 'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z', description: 'Loaded plugins' },
  { key: 'techstack', label: 'Tech Stack', icon: 'M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3', description: 'Detected stack' },
  { key: 'workspaces', label: 'Workspaces', icon: 'M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776', description: 'Multi-repo projects' },
];

const activeTabDef = computed(() => tabs.find((t) => t.key === activeTab.value));

onMounted(loadConfig);

watch(activeTab, (tab) => {
  if (tab === 'workspaces') ensureWorkspacesLoaded();
});
</script>

<template>
  <div class="config-page">
    <ErrorBoundary :error="error" />
    <LoadingSpinner v-if="isLoading" label="Loading configuration..." />

    <div v-else-if="!config" class="space-y-4">
      <EmptyState
        v-if="!error"
        title="No configuration available"
        description="No active Shazam project detected. Ensure the backend is running."
      />
      <div v-else class="flex flex-col items-center gap-4 rounded-2xl border border-gray-800 bg-surface-card px-6 py-16 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">⚠️</div>
        <div>
          <p class="text-sm font-medium text-gray-300">Configuration could not be loaded</p>
          <p class="mt-1 text-xs text-gray-500">Check backend connection and try again.</p>
        </div>
        <AppButton variant="primary" @click="loadConfig">Retry</AppButton>
      </div>
    </div>

    <div v-else class="space-y-5 sm:space-y-6">
      <!-- Fallback Data Notice -->
      <div
        v-if="isFallbackData"
        class="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
      >
        <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-amber-300">Partial configuration loaded</p>
          <p class="mt-0.5 text-xs text-amber-400/60">
            Config endpoint unavailable — showing data assembled from available APIs. Some sections may be incomplete.
          </p>
        </div>
      </div>

      <!-- Page Header -->
      <div class="flex items-center gap-2.5 sm:gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-shazam-500/10 text-base ring-1 ring-shazam-500/20 sm:h-10 sm:w-10 sm:text-lg">
          ⚙️
        </div>
        <div>
          <h1 class="page-title">Configuration</h1>
          <p class="page-subtitle">Manage your Shazam project settings</p>
        </div>
      </div>

      <!-- Tab Navigation — horizontally scrollable on mobile -->
      <div class="-mx-3 overflow-x-auto px-3 scrollbar-none sm:mx-0 sm:px-0" style="-webkit-overflow-scrolling: touch">
        <div class="inline-flex min-w-max gap-1 rounded-2xl border border-gray-800/60 bg-surface-card p-1.5">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="group relative flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 min-h-[40px] sm:min-h-[36px] sm:px-4 sm:text-sm"
            :class="activeTab === tab.key
              ? 'bg-shazam-500/10 text-shazam-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'"
            @click="activeTab = tab.key"
          >
            <svg
              class="h-4 w-4 shrink-0 transition-colors duration-200"
              :class="activeTab === tab.key ? 'text-shazam-400' : 'text-gray-600 group-hover:text-gray-400'"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
            </svg>
            <span>{{ tab.label }}</span>
            <!-- Active indicator dot -->
            <span
              v-if="activeTab === tab.key"
              class="absolute -bottom-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-shazam-400"
            />
          </button>
        </div>
      </div>

      <!-- Active tab description -->
      <div v-if="activeTabDef" class="flex items-center gap-2 text-xs text-gray-500">
        <span class="h-px flex-1 bg-gray-800/50" />
        <span>{{ activeTabDef.description }}</span>
        <span class="h-px flex-1 bg-gray-800/50" />
      </div>

      <!-- Tab Panels with transition -->
      <Transition name="v-fade-up" mode="out-in">
        <ConfigGeneralTab v-if="activeTab === 'general'" :key="'general'" :config="config" :domain-entries="domainEntries" />
        <ConfigRalphTab v-else-if="activeTab === 'ralph'" :key="'ralph'" :editable-config="editableConfig" :is-saving="isSaving" :save-success="saveSuccess" @save="saveRalphLoop" />
        <ConfigAgentsTab v-else-if="activeTab === 'agents'" :key="'agents'" :agent-entries="agentEntries" />
        <ConfigPluginsTab v-else-if="activeTab === 'plugins'" :key="'plugins'" :plugins="plugins" :is-reloading="isReloadingPlugins" @reload="handleReloadPlugins" />
        <ConfigTechStackTab v-else-if="activeTab === 'techstack'" :key="'techstack'" :tech-stack-entries="techStackEntries" />
        <ConfigWorkspacesTab v-else-if="activeTab === 'workspaces'" :key="'workspaces'" :workspaces="workspaces" :is-loading="isLoadingWorkspaces" :switching-to="switchingTo" @switch="handleSwitchWorkspace" />
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.config-page {
  animation: pageIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes pageIn {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
</style>
