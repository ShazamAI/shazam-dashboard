<script setup lang="ts">
/**
 * BudgetTracker — compact widget showing per-agent budget consumption
 * and total cost estimate. Reads from the agent store.
 */
import { computed } from 'vue';
import { useAgentStore } from '@/stores/agents';

const agentStore = useAgentStore();

interface BudgetEntry {
  name: string;
  tokensUsed: number;
  budget: number;
  percent: number;
  color: 'green' | 'amber' | 'red';
}

const entries = computed<BudgetEntry[]>(() => {
  return agentStore.agents
    .filter((a) => a.budget > 0)
    .map((a) => {
      const percent = Math.min((a.tokens_used / a.budget) * 100, 100);
      let color: 'green' | 'amber' | 'red' = 'green';
      if (percent >= 90) color = 'red';
      else if (percent >= 70) color = 'amber';
      return {
        name: a.name,
        tokensUsed: a.tokens_used,
        budget: a.budget,
        percent,
        color,
      };
    })
    .sort((a, b) => b.percent - a.percent);
});

const totalTokensUsed = computed(() =>
  agentStore.agents.reduce((sum, a) => sum + a.tokens_used, 0)
);

const totalBudget = computed(() =>
  agentStore.agents.reduce((sum, a) => sum + a.budget, 0)
);

const totalPercent = computed(() =>
  totalBudget.value > 0 ? (totalTokensUsed.value / totalBudget.value) * 100 : 0
);

// Rough cost estimate: ~$0.003 per 1K tokens (blended average)
const estimatedCost = computed(() => {
  const cost = (totalTokensUsed.value / 1000) * 0.003;
  if (cost < 0.01) return '< $0.01';
  return `$${cost.toFixed(2)}`;
});

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const barColorClasses: Record<string, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const barTrackClasses: Record<string, string> = {
  green: 'bg-emerald-500/10',
  amber: 'bg-amber-500/10',
  red: 'bg-red-500/10',
};

const textColorClasses: Record<string, string> = {
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
};
</script>

<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-medium text-white">Budget Usage</h3>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-gray-500">Est. cost</span>
        <span class="text-xs font-medium text-shazam-400">{{ estimatedCost }}</span>
      </div>
    </div>

    <!-- Total bar -->
    <div class="mb-4 pb-4 border-b border-gray-800">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs text-gray-400">Total</span>
        <span class="text-[10px] text-gray-500">
          {{ formatTokens(totalTokensUsed) }} / {{ formatTokens(totalBudget) }} tokens
        </span>
      </div>
      <div class="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="totalPercent >= 90 ? 'bg-red-500' : totalPercent >= 70 ? 'bg-amber-500' : 'bg-shazam-500'"
          :style="{ width: `${Math.min(totalPercent, 100)}%` }"
        />
      </div>
    </div>

    <!-- Per-agent bars -->
    <div v-if="entries.length === 0" class="text-center py-4">
      <p class="text-xs text-gray-600">No agents with budget configured</p>
    </div>

    <div v-else class="space-y-3 max-h-64 overflow-y-auto scrollbar-none">
      <div v-for="entry in entries" :key="entry.name" class="group">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-gray-300 truncate max-w-[140px]">{{ entry.name }}</span>
          <span :class="textColorClasses[entry.color]" class="text-[10px] font-medium tabular-nums">
            {{ entry.percent.toFixed(0) }}%
          </span>
        </div>
        <div class="h-1.5 rounded-full overflow-hidden" :class="barTrackClasses[entry.color]">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="barColorClasses[entry.color]"
            :style="{ width: `${entry.percent}%` }"
          />
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <span class="text-[9px] text-gray-600">{{ formatTokens(entry.tokensUsed) }} used</span>
          <span class="text-[9px] text-gray-600">{{ formatTokens(entry.budget) }} limit</span>
        </div>
      </div>
    </div>
  </div>
</template>
