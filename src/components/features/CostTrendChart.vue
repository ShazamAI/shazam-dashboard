<script setup lang="ts">
import { computed } from 'vue';
import type { CostSnapshot } from '@/composables/useMetrics';

interface Props {
  data: CostSnapshot[];
  height?: number;
}

const props = withDefaults(defineProps<Props>(), { height: 120 });

const WIDTH = 400;

const points = computed(() => {
  if (props.data.length < 2) return '';

  const costs = props.data.map((d) => d.totalCost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs) || 1;
  const range = maxCost - minCost || 1;

  return props.data
    .map((d, i) => {
      const x = (i / (props.data.length - 1)) * WIDTH;
      const y = props.height - ((d.totalCost - minCost) / range) * (props.height - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');
});

const currentCost = computed(() => {
  const last = props.data[props.data.length - 1];
  return last ? `$${last.totalCost.toFixed(2)}` : '$0.00';
});

const costDelta = computed(() => {
  if (props.data.length < 2) return null;
  const first = props.data[0]!.totalCost;
  const last = props.data[props.data.length - 1]!.totalCost;
  return last - first;
});
</script>

<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost Trend</h3>
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-white">{{ currentCost }}</span>
        <span
          v-if="costDelta !== null"
          class="text-[10px] font-medium"
          :class="costDelta > 0 ? 'text-red-400' : 'text-emerald-400'"
        >
          {{ costDelta > 0 ? '+' : '' }}${{ costDelta.toFixed(3) }}
        </span>
      </div>
    </div>

    <svg
      v-if="data.length >= 2"
      :viewBox="`0 0 ${WIDTH} ${height}`"
      class="w-full"
      preserveAspectRatio="none"
    >
      <!-- Grid lines -->
      <line
        v-for="i in 3"
        :key="i"
        :x1="0"
        :y1="height * i / 4"
        :x2="WIDTH"
        :y2="height * i / 4"
        stroke="rgb(55,65,81)"
        stroke-width="0.5"
        stroke-dasharray="4,4"
      />

      <!-- Area fill -->
      <polygon
        :points="`0,${height} ${points} ${WIDTH},${height}`"
        fill="url(#costGradient)"
        opacity="0.3"
      />

      <!-- Line -->
      <polyline
        :points="points"
        fill="none"
        stroke="rgb(168,85,247)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Gradient -->
      <defs>
        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(168,85,247)" stop-opacity="0.4" />
          <stop offset="100%" stop-color="rgb(168,85,247)" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>

    <p v-else class="text-center text-xs text-gray-600 py-4">Collecting data...</p>

    <div class="flex items-center justify-between mt-2 text-[9px] text-gray-600">
      <span>{{ data.length }} samples</span>
      <span>Last {{ Math.round((Date.now() - (data[0]?.timestamp ?? Date.now())) / 60000) }}min</span>
    </div>
  </div>
</template>
