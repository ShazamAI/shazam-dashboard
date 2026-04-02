<script setup lang="ts">
import { computed } from 'vue';
import type { AgentWorker } from '@/types';
import {
  statusDotClass,
  formatTokens,
  budgetPercentage,
  budgetColor,
} from '@/api/agentService';
import StatusBadge from '@/components/common/StatusBadge.vue';
import AppButton from '@/components/common/Button.vue';

interface Props {
  agent: AgentWorker;
  sparkline?: string;
}

const props = withDefaults(defineProps<Props>(), {
  sparkline: '',
});

const emit = defineEmits<{
  edit: [agent: AgentWorker];
}>();

const budgetPct = computed(() => budgetPercentage(props.agent));

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    pm: 'Project Manager',
    senior_dev: 'Senior Developer',
    junior_dev: 'Junior Developer',
    qa: 'QA Engineer',
    designer: 'Designer',
    researcher: 'Researcher',
    devops: 'DevOps Engineer',
    writer: 'Technical Writer',
    market_analyst: 'Market Analyst',
    competitor_analyst: 'Competitor Analyst',
    pr_reviewer: 'PR Reviewer',
  };
  return map[props.agent.role] ?? props.agent.role;
});

const roleIcon = computed(() => {
  const map: Record<string, string> = {
    pm: '👑',
    senior_dev: '⚡',
    junior_dev: '🔧',
    qa: '🧪',
    designer: '🎨',
    researcher: '🔬',
    devops: '🚀',
    writer: '✍️',
    market_analyst: '📊',
    competitor_analyst: '🔍',
    pr_reviewer: '📝',
  };
  return map[props.agent.role] ?? '🤖';
});

const workspaceLabel = computed(() => {
  const d = props.agent.domain?.toLowerCase() ?? '';
  if (d.includes('dashboard') || d.includes('frontend')) return 'Dashboard';
  if (d.includes('vscode') || d.includes('extension')) return 'VS Code';
  if (d.includes('backend') || d.includes('api')) return 'Backend';
  return props.agent.domain ?? 'General';
});

const workspaceColor = computed(() => {
  const label = workspaceLabel.value.toLowerCase();
  if (label === 'dashboard') return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
  if (label === 'vs code') return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
  if (label === 'backend') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
});

const isActive = computed(() =>
  ['busy', 'working', 'executing'].includes(props.agent.status)
);
</script>

<template>
  <div
    class="agent-card group relative overflow-hidden rounded-2xl border border-gray-800/80 bg-gradient-to-br from-surface-card to-gray-900 transition-all duration-300 hover:border-gray-700/80 hover:shadow-lg hover:shadow-shazam-500/5"
    :class="{ 'border-shazam-500/30 shadow-shazam-500/10 shadow-md': isActive }"
  >
    <!-- Active glow effect -->
    <div
      v-if="isActive"
      class="active-glow pointer-events-none absolute -inset-px rounded-2xl opacity-50"
    />

    <div class="relative p-3.5 sm:p-5">
      <!-- Top row: Avatar + Name + Status -->
      <div class="mb-3 flex items-start justify-between sm:mb-4">
        <div class="flex items-center gap-2.5 sm:gap-3">
          <!-- Agent avatar -->
          <div class="relative flex-shrink-0">
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl text-lg transition-transform duration-300 group-hover:scale-105"
              :class="isActive ? 'bg-shazam-500/15 ring-1 ring-shazam-500/30' : 'bg-gray-800 ring-1 ring-gray-700/50'"
            >
              {{ roleIcon }}
            </div>
            <!-- Status dot on avatar -->
            <span
              :class="statusDotClass(agent.status)"
              class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface-card"
              :aria-label="`Agent status: ${agent.status}`"
              role="status"
            />
          </div>

          <div class="min-w-0">
            <h3 class="truncate text-sm font-semibold text-white">{{ agent.name }}</h3>
            <p class="text-xs text-gray-500">{{ roleLabel }}</p>
          </div>
        </div>

        <StatusBadge :status="agent.status" />
      </div>

      <!-- Workspace + Domain badges -->
      <div class="mb-4 flex flex-wrap items-center gap-1.5">
        <span
          class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          :class="workspaceColor"
        >
          {{ workspaceLabel }}
        </span>
        <span
          v-if="agent.supervisor"
          class="inline-flex items-center gap-1 rounded-lg border border-gray-700/50 bg-gray-800/50 px-2 py-0.5 text-[10px] text-gray-500"
        >
          → {{ agent.supervisor }}
        </span>
      </div>

      <!-- Sparkline activity -->
      <div
        v-if="sparkline"
        class="mb-4 overflow-hidden rounded-lg bg-gray-900/50 px-3 py-2"
      >
        <div class="mb-1 flex items-center justify-between">
          <span class="text-[10px] font-medium uppercase tracking-wider text-gray-600">Activity</span>
          <span class="text-[10px] text-gray-600">Last 100s</span>
        </div>
        <div class="font-mono text-xs tracking-[0.2em]" :class="isActive ? 'text-shazam-400' : 'text-gray-600'">
          {{ sparkline }}
        </div>
      </div>

      <!-- Stats grid -->
      <div class="mb-4 grid grid-cols-3 gap-2">
        <div class="rounded-lg bg-gray-900/50 px-2.5 py-2 text-center">
          <div class="text-xs font-semibold text-gray-300">{{ agent.task_history.length }}</div>
          <div class="text-[10px] text-gray-600">Tasks</div>
        </div>
        <div class="rounded-lg bg-gray-900/50 px-2.5 py-2 text-center">
          <div class="text-xs font-semibold text-gray-300">{{ agent.tools.length }}</div>
          <div class="text-[10px] text-gray-600">Tools</div>
        </div>
        <div class="rounded-lg bg-gray-900/50 px-2.5 py-2 text-center">
          <div class="text-xs font-semibold text-gray-300">{{ agent.model?.split('-').pop() ?? '—' }}</div>
          <div class="text-[10px] text-gray-600">Model</div>
        </div>
      </div>

      <!-- Budget usage -->
      <div class="mb-4">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-[10px] font-medium uppercase tracking-wider text-gray-600">Budget</span>
          <span class="text-xs tabular-nums text-gray-400">
            {{ formatTokens(agent.tokens_used) }}
            <span class="text-gray-600">/</span>
            {{ formatTokens(agent.budget) }}
            <span class="ml-1 text-gray-600">({{ budgetPct }}%)</span>
          </span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            :class="budgetColor(budgetPct)"
            :style="{ width: `${budgetPct}%` }"
          />
        </div>
      </div>

      <!-- Tools pills -->
      <div v-if="agent.tools.length > 0" class="mb-4 flex flex-wrap gap-1">
        <span
          v-for="tool in agent.tools.slice(0, 6)"
          :key="tool"
          class="rounded-md bg-shazam-500/8 px-1.5 py-0.5 text-[10px] font-medium text-shazam-400/80 ring-1 ring-shazam-500/10"
        >
          {{ tool }}
        </span>
        <span
          v-if="agent.tools.length > 6"
          class="rounded-md bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500"
        >
          +{{ agent.tools.length - 6 }}
        </span>
      </div>

      <!-- Modules -->
      <div v-if="agent.modules.length > 0" class="mb-4 flex flex-wrap gap-1">
        <span
          v-for="mod in agent.modules"
          :key="mod"
          class="rounded-md bg-gray-800/80 px-1.5 py-0.5 text-[10px] text-gray-500 ring-1 ring-gray-700/50"
        >
          {{ mod }}
        </span>
      </div>

      <!-- Edit action -->
      <AppButton variant="secondary" size="sm" block :aria-label="`Configure agent ${agent.name}`" @click="emit('edit', agent)">
        Configure Agent
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.agent-card {
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

.active-glow {
  background: radial-gradient(circle at 50% 0%, rgba(255, 202, 29, 0.08) 0%, transparent 70%);
}
</style>
