<script setup lang="ts">
import type { CircuitBreakerStatus } from '@/types';

interface Props {
  circuitBreaker: CircuitBreakerStatus;
}

defineProps<Props>();
</script>

<template>
  <div
    class="rounded-xl border p-3 sm:p-4"
    :class="circuitBreaker.tripped
      ? 'border-red-500/20 bg-red-500/5'
      : 'border-gray-800 bg-surface-card'"
  >
    <div class="mb-3 flex items-center justify-between">
      <h3 class="section-title">Circuit Breaker</h3>
      <span
        class="rounded-full px-2.5 py-0.5 text-xs font-medium"
        :class="circuitBreaker.tripped
          ? 'bg-red-500/10 text-red-400'
          : 'bg-emerald-500/10 text-emerald-400'"
      >
        {{ circuitBreaker.tripped ? 'TRIPPED' : 'Healthy' }}
      </span>
    </div>
    <div class="space-y-2 text-xs">
      <div class="flex justify-between">
        <span class="text-gray-500">Consecutive Failures</span>
        <span
          class="font-mono font-medium"
          :class="circuitBreaker.consecutive_failures > 0 ? 'text-red-400' : 'text-gray-300'"
        >
          {{ circuitBreaker.consecutive_failures }} / {{ circuitBreaker.threshold }}
        </span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-gray-800">
        <div
          class="h-full rounded-full transition-all"
          :class="circuitBreaker.tripped ? 'bg-red-500' : 'bg-yellow-500'"
          :style="{ width: `${Math.min((circuitBreaker.consecutive_failures / circuitBreaker.threshold) * 100, 100)}%` }"
        />
      </div>
      <p v-if="circuitBreaker.last_error" class="mt-1 truncate text-red-400/70">
        {{ circuitBreaker.last_error }}
      </p>
    </div>
  </div>
</template>
