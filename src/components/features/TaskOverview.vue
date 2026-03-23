<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useCountUp } from '@/composables/useMotion';

interface Props {
  pending: number;
  running: number;
  done: number;
  failed: number;
  awaiting: number;
  total: number;
}

const props = defineProps<Props>();

const { displayValue: animPending } = useCountUp(toRef(props, 'pending'));
const { displayValue: animRunning } = useCountUp(toRef(props, 'running'));
const { displayValue: animDone } = useCountUp(toRef(props, 'done'));
const { displayValue: animFailed } = useCountUp(toRef(props, 'failed'));
const { displayValue: animAwaiting } = useCountUp(toRef(props, 'awaiting'));
const { displayValue: animTotal } = useCountUp(toRef(props, 'total'));

const completionRate = computed(() => {
  if (props.total === 0) return 0;
  return Math.round((props.done / props.total) * 100);
});

interface MetricDef {
  label: string;
  value: number;
  color: string;
  dotClass: string;
  bgClass: string;
}

const metrics = computed<MetricDef[]>(() => [
  { label: 'Pending',  value: animPending.value,  color: 'text-yellow-400',  dotClass: 'bg-yellow-400',           bgClass: 'bg-yellow-500/5 border-yellow-500/10' },
  { label: 'Running',  value: animRunning.value,  color: 'text-blue-400',    dotClass: 'bg-blue-400 animate-pulse', bgClass: 'bg-blue-500/5 border-blue-500/10' },
  { label: 'Done',     value: animDone.value,     color: 'text-emerald-400', dotClass: 'bg-emerald-400',          bgClass: 'bg-emerald-500/5 border-emerald-500/10' },
  { label: 'Failed',   value: animFailed.value,   color: 'text-red-400',     dotClass: 'bg-red-400',              bgClass: 'bg-red-500/5 border-red-500/10' },
  { label: 'Awaiting', value: animAwaiting.value,  color: 'text-purple-400', dotClass: 'bg-purple-400',           bgClass: 'bg-purple-500/5 border-purple-500/10' },
]);
</script>

<template>
  <div class="task-overview card overflow-hidden">
    <!-- Header with total + completion -->
    <div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
      <h3 class="text-sm font-semibold text-white">Task Overview</h3>
      <div class="flex items-center gap-2">
        <span class="text-xs tabular-nums text-gray-500">
          <span class="font-semibold text-white">{{ animTotal }}</span> total
        </span>
      </div>
    </div>

    <div class="p-4 space-y-4">
      <!-- Completion bar -->
      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Completion</span>
          <span class="text-xs font-semibold tabular-nums" :class="completionRate >= 80 ? 'text-emerald-400' : completionRate >= 50 ? 'text-shazam-400' : 'text-gray-400'">
            {{ completionRate }}%
          </span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            class="completion-bar h-full rounded-full transition-all duration-700 ease-out"
            :class="completionRate >= 80 ? 'bg-emerald-500' : completionRate >= 50 ? 'bg-shazam-500' : 'bg-gray-600'"
            :style="{ width: `${completionRate}%` }"
          />
        </div>
      </div>

      <!-- Metric grid -->
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <div
          v-for="(m, i) in metrics"
          :key="m.label"
          class="metric-tile group rounded-xl border px-2.5 py-2 text-center transition-all duration-200 hover:shadow-elevation-1"
          :class="m.bgClass"
          :style="{ animationDelay: `${i * 60}ms` }"
        >
          <div class="flex items-center justify-center gap-1 mb-0.5">
            <span class="h-1.5 w-1.5 rounded-full transition-transform duration-200 group-hover:scale-125" :class="m.dotClass" />
          </div>
          <p class="text-lg font-bold tabular-nums leading-none sm:text-xl" :class="m.color">
            {{ m.value }}
          </p>
          <p class="mt-1 text-[9px] font-semibold uppercase tracking-wider text-gray-500 sm:text-[10px]">
            {{ m.label }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-overview {
  animation: overviewIn 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes overviewIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.metric-tile {
  animation: tileIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

@keyframes tileIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.completion-bar {
  animation: barFill 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes barFill {
  from { width: 0%; }
}
</style>
