<script setup lang="ts">
import { circuitBreakerTripped } from '@/composables/useRealtimeSync';
import { useWebSocket } from '@/composables/useWebSocket';

const ws = useWebSocket();

function resumeAgents() {
  ws.sendCommand('/resume');
  circuitBreakerTripped.value = false;
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
          <div class="text-xs opacity-80">Agents stopped after consecutive failures. Check logs for details.</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="rounded-lg bg-white/20 px-4 py-1.5 text-xs font-medium hover:bg-white/30 transition-colors"
          @click="resumeAgents"
        >
          Resume Agents
        </button>
        <button
          class="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 transition-colors"
          @click="circuitBreakerTripped = false"
        >
          Dismiss
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
