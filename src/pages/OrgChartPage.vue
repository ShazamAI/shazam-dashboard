<script setup lang="ts">
import { computed } from 'vue';
import { useOrgChart } from '@/composables/useOrgChart';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import OrgTreeNode from '@/components/features/OrgTreeNode.vue';
import type { OrgChartNode } from '@/types';

const { orgChart, isLoading, error, navigateToAgent } = useOrgChart();

// ─── Stats computed from tree ─────────────────────────
function flattenNodes(nodes: OrgChartNode[]): OrgChartNode[] {
  const result: OrgChartNode[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.reports.length > 0) result.push(...flattenNodes(n.reports));
  }
  return result;
}

const allNodes = computed(() => flattenNodes(orgChart.value));
const totalAgents = computed(() => allNodes.value.length);

const statusCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const n of allNodes.value) {
    counts[n.status] = (counts[n.status] ?? 0) + 1;
  }
  return counts;
});

// Domain grouping
interface DomainInfo {
  name: string;
  count: number;
  color: { dot: string; text: string; bg: string };
}

const DOMAIN_COLOR_MAP: Record<string, { dot: string; text: string; bg: string }> = {
  dashboard: { dot: 'bg-violet-400', text: 'text-violet-400', bg: 'bg-violet-500/10' },
  vscode: { dot: 'bg-sky-400', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  backend: { dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  frontend: { dot: 'bg-violet-400', text: 'text-violet-400', bg: 'bg-violet-500/10' },
  infrastructure: { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  design: { dot: 'bg-pink-400', text: 'text-pink-400', bg: 'bg-pink-500/10' },
  research: { dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  qa: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  management: { dot: 'bg-shazam-400', text: 'text-shazam-400', bg: 'bg-shazam-500/10' },
};

const DEFAULT_COLOR = { dot: 'bg-gray-500', text: 'text-gray-400', bg: 'bg-gray-500/10' };

const domains = computed<DomainInfo[]>(() => {
  const map = new Map<string, number>();
  for (const n of allNodes.value) {
    const d = n.domain ?? 'unassigned';
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      color: DOMAIN_COLOR_MAP[name.toLowerCase()] ?? DEFAULT_COLOR,
    }));
});

// Status display config
const STATUS_DISPLAY: Record<string, { dot: string; label: string }> = {
  idle: { dot: 'bg-emerald-400', label: 'Idle' },
  busy: { dot: 'bg-amber-400 animate-pulse', label: 'Busy' },
  working: { dot: 'bg-amber-400 animate-pulse', label: 'Working' },
  executing: { dot: 'bg-cyan-400 animate-pulse', label: 'Executing' },
  waiting: { dot: 'bg-yellow-400 animate-pulse', label: 'Waiting' },
  paused: { dot: 'bg-gray-500', label: 'Paused' },
  error: { dot: 'bg-red-500', label: 'Error' },
  offline: { dot: 'bg-gray-600', label: 'Offline' },
};
</script>

<template>
  <div class="org-chart-page">
    <ErrorBoundary :error="error" />

    <!-- Page Header -->
    <div class="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        <div class="flex items-center gap-2.5 mb-1 sm:gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-shazam-500/10 text-base sm:h-10 sm:w-10 sm:text-lg">
            🏛️
          </div>
          <div>
            <h1 class="page-title">Organization Chart</h1>
            <p class="page-subtitle">Agent hierarchy & supervision tree</p>
          </div>
        </div>
      </div>

      <!-- Quick stats -->
      <div v-if="!isLoading && orgChart.length > 0" class="flex flex-wrap items-center gap-2 sm:gap-4">
        <div class="flex items-center gap-2 rounded-xl border border-gray-800 bg-surface-card px-3 py-1.5 sm:px-4 sm:py-2">
          <span class="text-xl font-bold text-white sm:text-2xl">{{ totalAgents }}</span>
          <span class="text-[10px] text-gray-500 leading-tight sm:text-xs">Total<br>Agents</span>
        </div>
        <div class="flex items-center gap-2 rounded-xl border border-gray-800 bg-surface-card px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
          <template v-for="(count, status) in statusCounts" :key="status">
            <div class="flex items-center gap-1 sm:gap-1.5" :title="`${STATUS_DISPLAY[status]?.label ?? status}: ${count}`">
              <span class="h-2 w-2 rounded-full" :class="STATUS_DISPLAY[status]?.dot ?? 'bg-gray-500'" />
              <span class="text-xs font-semibold text-gray-300 sm:text-sm">{{ count }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="isLoading" label="Loading org chart..." />

    <!-- Empty State -->
    <EmptyState
      v-else-if="orgChart.length === 0"
      title="No org chart available"
      description="No active project detected. The org chart will appear when agents are running."
    />

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- Domain Legend Bar -->
      <div
        v-if="domains.length > 0"
        class="flex flex-wrap items-center gap-2 rounded-xl border border-gray-800/60 bg-surface-card/50 px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-5 sm:py-3"
      >
        <span class="micro-label sm:mr-1">Domains</span>
        <div
          v-for="d in domains"
          :key="d.name"
          class="flex items-center gap-1 rounded-lg px-2 py-0.5 transition-colors duration-200 hover:bg-gray-800/50 sm:gap-1.5 sm:px-2.5 sm:py-1"
          :class="d.color.bg"
        >
          <span class="h-2 w-2 rounded-full" :class="d.color.dot" />
          <span class="text-[11px] font-medium capitalize sm:text-xs" :class="d.color.text">{{ d.name }}</span>
          <span class="ml-0.5 text-[10px] font-semibold text-gray-600">{{ d.count }}</span>
        </div>
      </div>

      <!-- Org Tree -->
      <div class="org-chart-canvas relative overflow-x-auto overflow-y-visible pb-8 pt-2 sm:pb-12 sm:pt-4" style="-webkit-overflow-scrolling: touch">
        <!-- Mobile scroll hint -->
        <p class="mb-2 text-center text-[10px] text-gray-600 sm:hidden">Swipe to explore</p>
        <!-- Subtle grid background -->
        <div class="absolute inset-0 bg-dots-lg pointer-events-none opacity-30" />

        <div class="relative flex justify-center gap-6 min-w-max px-4 sm:gap-10 sm:px-8">
          <OrgTreeNode
            v-for="rootNode in orgChart"
            :key="rootNode.name"
            :node="rootNode"
            :depth="0"
            @select="navigateToAgent"
          />
        </div>
      </div>

      <!-- Status Legend (bottom) -->
      <div class="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-gray-800/40 bg-surface-card/30 px-4 py-2.5 sm:gap-5 sm:px-6 sm:py-3">
        <span class="micro-label">Status</span>
        <div
          v-for="(config, key) in STATUS_DISPLAY"
          :key="key"
          class="flex items-center gap-1 sm:gap-1.5"
        >
          <span class="h-2 w-2 rounded-full" :class="config.dot" />
          <span class="text-[11px] text-gray-500 sm:text-xs">{{ config.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.org-chart-page {
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

.org-chart-canvas {
  scrollbar-width: thin;
  scrollbar-color: theme('colors.gray.800') transparent;
}

.org-chart-canvas::-webkit-scrollbar {
  height: 6px;
}

.org-chart-canvas::-webkit-scrollbar-track {
  background: transparent;
}

.org-chart-canvas::-webkit-scrollbar-thumb {
  background: theme('colors.gray.800');
  border-radius: 3px;
}

.org-chart-canvas::-webkit-scrollbar-thumb:hover {
  background: theme('colors.gray.700');
}
</style>
