<script setup lang="ts">
import { computed } from 'vue';
import type { Task, Company } from '@/types';
import AppButton from '@/components/common/Button.vue';

interface Props {
  company: Company | null;
  tasks: Task[];
  totalCost: number;
  isConnected: boolean;
  isPaused: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  start: [];
  stop: [];
  resume: [];
  approveAll: [];
}>();

const pendingCount = computed(() => props.tasks.filter((t) => t.status === 'pending').length);
const runningCount = computed(() => props.tasks.filter((t) => t.status === 'in_progress').length);
const doneCount = computed(() => props.tasks.filter((t) => t.status === 'completed').length);
const failedCount = computed(() => props.tasks.filter((t) => t.status === 'failed').length);
const awaitingCount = computed(() => props.tasks.filter((t) => t.status === 'awaiting_approval').length);
const totalCount = computed(() => props.tasks.length);
const formattedCost = computed(() => props.totalCost < 0.01 ? '<$0.01' : `$${props.totalCost.toFixed(2)}`);
</script>

<template>
  <div class="status-bar overflow-hidden rounded-xl border border-gray-800/80 bg-gradient-to-r from-surface-card to-gray-900/80">
    <!-- Top section: Company info + Actions -->
    <div class="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
      <!-- Connection + Company -->
      <div class="flex items-center gap-2.5">
        <div class="relative">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            :class="isConnected
              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
              : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'"
          >
            {{ props.company?.name?.[0]?.toUpperCase() ?? '?' }}
          </div>
          <!-- Live dot -->
          <span
            class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface-card"
            :class="isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'"
          />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="truncate text-sm font-semibold text-white">
              {{ props.company?.name ?? 'No Company' }}
            </span>
            <span
              v-if="props.company"
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="props.isPaused
                ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20'
                : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'"
            >
              <span
                class="h-1 w-1 rounded-full"
                :class="props.isPaused ? 'bg-yellow-400' : 'bg-emerald-400 animate-pulse'"
              />
              {{ props.isPaused ? 'Paused' : 'Live' }}
            </span>
          </div>
          <span class="hidden text-[10px] text-gray-500 sm:inline">
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <!-- Divider -->
      <div class="hidden h-8 w-px bg-gray-800 sm:block" />

      <!-- Metric pills -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <div class="metric-pill" title="Pending">
          <span class="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          <span class="font-mono text-xs font-bold text-yellow-400">{{ pendingCount }}</span>
          <span class="hidden text-[10px] text-gray-500 sm:inline">pending</span>
        </div>
        <div class="metric-pill" title="Running">
          <span class="h-1.5 w-1.5 rounded-full bg-blue-400" :class="{ 'animate-pulse': runningCount > 0 }" />
          <span class="font-mono text-xs font-bold text-blue-400">{{ runningCount }}</span>
          <span class="hidden text-[10px] text-gray-500 sm:inline">running</span>
        </div>
        <div class="metric-pill" title="Completed">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span class="font-mono text-xs font-bold text-emerald-400">{{ doneCount }}</span>
          <span class="hidden text-[10px] text-gray-500 sm:inline">done</span>
        </div>
        <div v-if="failedCount > 0" class="metric-pill" title="Failed">
          <span class="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span class="font-mono text-xs font-bold text-red-400">{{ failedCount }}</span>
          <span class="hidden text-[10px] text-gray-500 sm:inline">failed</span>
        </div>
      </div>

      <!-- Divider -->
      <div class="hidden h-8 w-px bg-gray-800 sm:block" />

      <!-- Cost + Total -->
      <div class="hidden items-center gap-3 sm:flex">
        <div class="text-center">
          <div class="text-[10px] text-gray-600">Total</div>
          <div class="font-mono text-xs font-bold text-white">{{ totalCount }}</div>
        </div>
        <div class="text-center">
          <div class="text-[10px] text-gray-600">Cost</div>
          <div class="font-mono text-xs font-bold text-shazam-400">{{ formattedCost }}</div>
        </div>
      </div>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Actions -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Mobile cost badge -->
        <span class="font-mono text-[10px] font-semibold text-shazam-400 sm:hidden">{{ formattedCost }}</span>

        <AppButton
          v-if="awaitingCount > 0"
          variant="info"
          size="sm"
          @click="emit('approveAll')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span class="hidden sm:inline">Approve</span> ({{ awaitingCount }})
        </AppButton>
        <AppButton
          v-if="props.isPaused"
          variant="success"
          size="sm"
          @click="emit('resume')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          Resume
        </AppButton>
        <AppButton
          v-else-if="props.company"
          variant="danger"
          size="sm"
          @click="emit('stop')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Stop
        </AppButton>
        <AppButton
          v-if="!props.company"
          variant="primary"
          size="sm"
          @click="emit('start')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Start
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  animation: statusBarIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes statusBarIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.metric-pill {
  @apply flex items-center gap-1 rounded-lg border border-gray-800/60 bg-gray-900/50 px-2 py-1 transition-colors duration-200;
}

.metric-pill:hover {
  @apply border-gray-700/60 bg-gray-800/50;
}
</style>
