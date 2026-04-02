<script setup lang="ts">
import type { HealthData } from '@/composables/useHealth';

interface Props {
  health: HealthData | null;
  formattedUptime: string;
}

defineProps<Props>();

const emit = defineEmits<{
  resetCircuitBreaker: [];
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
    <!-- Memory -->
    <div class="rounded-2xl border border-gray-800 bg-surface-card px-4 py-3" aria-label="Memory usage">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
          <svg class="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div>
          <p class="text-[10px] uppercase tracking-wider text-gray-500">Memory</p>
          <p class="text-sm font-semibold text-white">
            {{ health ? `${health.memory_mb.toFixed(0)} MB` : '--' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Uptime -->
    <div class="rounded-2xl border border-gray-800 bg-surface-card px-4 py-3" aria-label="System uptime">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <svg class="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="text-[10px] uppercase tracking-wider text-gray-500">Uptime</p>
          <p class="text-sm font-semibold text-white">{{ formattedUptime }}</p>
        </div>
      </div>
    </div>

    <!-- Active Sessions -->
    <div class="rounded-2xl border border-gray-800 bg-surface-card px-4 py-3" aria-label="Active sessions">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-shazam-500/10">
          <svg class="h-4 w-4 text-shazam-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <div>
          <p class="text-[10px] uppercase tracking-wider text-gray-500">Sessions</p>
          <p class="text-sm font-semibold text-white">
            {{ health ? health.active_sessions : '--' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Circuit Breaker -->
    <div class="rounded-2xl border bg-surface-card px-4 py-3" aria-label="Circuit breaker status"
      :class="health?.circuit_breaker_tripped ? 'border-red-500/40' : 'border-gray-800'"
    >
      <div class="flex items-center gap-2">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg"
          :class="health?.circuit_breaker_tripped ? 'bg-red-500/15' : 'bg-gray-700/40'"
        >
          <svg
            class="h-4 w-4"
            :class="health?.circuit_breaker_tripped ? 'text-red-400' : 'text-gray-500'"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-[10px] uppercase tracking-wider text-gray-500">Circuit Breaker</p>
          <p class="text-sm font-semibold" :class="health?.circuit_breaker_tripped ? 'text-red-400' : 'text-emerald-400'">
            {{ health ? (health.circuit_breaker_tripped ? 'TRIPPED' : 'OK') : '--' }}
          </p>
        </div>
        <button
          class="rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors"
          :class="health?.circuit_breaker_tripped
            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            : 'bg-gray-700/40 text-gray-500 hover:bg-gray-700/60 hover:text-gray-300'"
          @click="emit('resetCircuitBreaker')"
        >
          Reset
        </button>
      </div>
    </div>
  </div>
</template>
