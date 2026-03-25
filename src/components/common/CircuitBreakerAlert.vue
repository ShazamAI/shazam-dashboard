<script setup lang="ts">
import { ref } from 'vue';
import { circuitBreakerTripped } from '@/composables/useRealtimeSync';
import { post } from '@/api/http';
import { useActiveCompany } from '@/composables/useActiveCompany';

const { activeCompany } = useActiveCompany();
const isResuming = ref(false);
const isResetting = ref(false);

async function resetCircuitBreaker() {
  isResetting.value = true;
  try {
    await post('/ralph-loop/reset-circuit-breaker', {});
    circuitBreakerTripped.value = false;
  } catch { /* ignore */ }
  isResetting.value = false;
}

async function resumeAndRetry() {
  isResuming.value = true;
  try {
    const company = activeCompany.value?.name;
    // Reset circuit breaker + resume loop
    await post('/ralph-loop/resume', { company });
    // Retry all failed tasks
    await post('/tasks/bulk', { action: 'retry', task_ids: [] }).catch(() => {});
    circuitBreakerTripped.value = false;
  } catch { /* ignore */ }
  isResuming.value = false;
}

async function resumeOnly() {
  try {
    const company = activeCompany.value?.name;
    await post('/ralph-loop/resume', { company });
    circuitBreakerTripped.value = false;
  } catch { /* ignore */ }
}
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="circuitBreakerTripped"
      class="fixed top-0 left-0 right-0 z-[100] bg-red-500/95 text-white px-4 py-3 flex items-center justify-between backdrop-blur-sm shadow-lg"
    >
      <div class="flex items-center gap-3">
        <span class="text-lg">⚠️</span>
        <div>
          <div class="text-sm font-semibold">Circuit Breaker Triggered</div>
          <div class="text-xs opacity-80">Agents stopped after consecutive failures.</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="rounded-lg bg-white/20 px-4 py-1.5 text-xs font-medium hover:bg-white/30 transition-colors"
          :disabled="isResuming"
          @click="resumeAndRetry"
        >
          {{ isResuming ? 'Resuming...' : 'Resume + Retry Failed' }}
        </button>
        <button
          class="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 transition-colors"
          @click="resumeOnly"
        >
          Resume Only
        </button>
        <button
          class="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs font-medium hover:bg-emerald-600 transition-colors"
          :disabled="isResetting"
          @click="resetCircuitBreaker"
        >
          {{ isResetting ? 'Resetting...' : 'Reset Circuit Breaker' }}
        </button>
        <button
          class="rounded-lg bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20 transition-colors"
          @click="circuitBreakerTripped = false"
        >
          ✕
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active { transition: all 0.3s ease-out; }
.slide-down-leave-active { transition: all 0.2s ease-in; }
.slide-down-enter-from { transform: translateY(-100%); opacity: 0; }
.slide-down-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
