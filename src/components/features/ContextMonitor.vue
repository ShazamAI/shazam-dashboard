<script setup lang="ts">
/**
 * ContextMonitor — compact widget showing context window usage per agent.
 * Displays how much of the model's context window each agent is consuming.
 */
import { computed } from 'vue';

interface ContextEntry {
  agent: string;
  lastInput: number;
  lastOutput: number;
  peakInput: number;
  capacity: number;
  usagePercent: number;
  warning: boolean;
}

interface Props {
  entries: ContextEntry[];
}

const props = defineProps<Props>();

const sortedEntries = computed(() =>
  [...props.entries].sort((a, b) => b.usagePercent - a.usagePercent)
);

function barColor(pct: number): string {
  if (pct > 90) return 'bg-red-500';
  if (pct > 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function trackColor(pct: number): string {
  if (pct > 90) return 'bg-red-500/10';
  if (pct > 70) return 'bg-amber-500/10';
  return 'bg-emerald-500/10';
}

function textColor(pct: number): string {
  if (pct > 90) return 'text-red-400';
  if (pct > 70) return 'text-amber-400';
  return 'text-emerald-400';
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
</script>

<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-sm font-medium text-white">Context Window</h3>
      <span class="text-[10px] text-gray-500">200K capacity</span>
    </div>

    <!-- Empty state -->
    <div v-if="sortedEntries.length === 0" class="py-4 text-center">
      <p class="text-xs text-gray-600">No context data yet. Agents will report usage after tasks run.</p>
    </div>

    <!-- Per-agent context bars -->
    <div v-else class="max-h-64 space-y-3 overflow-y-auto scrollbar-none">
      <div v-for="entry in sortedEntries" :key="entry.agent" class="group">
        <div class="mb-1 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span
              v-if="entry.warning"
              class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"
              aria-label="Context window warning"
            />
            <span class="max-w-[140px] truncate text-xs text-gray-300">{{ entry.agent }}</span>
          </div>
          <span :class="textColor(entry.usagePercent)" class="text-[10px] font-medium tabular-nums">
            {{ entry.usagePercent }}%
          </span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full" :class="trackColor(entry.usagePercent)">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="barColor(entry.usagePercent)"
            :style="{ width: `${Math.min(entry.usagePercent, 100)}%` }"
          />
        </div>
        <div class="mt-0.5 flex items-center justify-between">
          <span class="text-[9px] text-gray-600">
            in: {{ formatTokens(entry.lastInput) }} | out: {{ formatTokens(entry.lastOutput) }}
          </span>
          <span class="text-[9px] text-gray-600">
            peak: {{ formatTokens(entry.peakInput) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
