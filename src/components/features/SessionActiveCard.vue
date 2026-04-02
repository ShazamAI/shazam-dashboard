<script setup lang="ts">
import type { SessionRow } from '@/composables/useSessions';
import { agentInitials, agentColor, formatIdleShort } from '@/composables/useSessions';

interface Props {
  session: SessionRow;
  nowMs: number;
  utilizationPercent: number;
  animationDelay: number;
}

defineProps<Props>();
</script>

<template>
  <div
    class="session-card group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-surface-card to-gray-900 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
    :style="{ animationDelay: `${animationDelay}ms` }"
    :aria-label="`Active session: ${session.agent_name}, ${session.task_count} tasks, ${utilizationPercent}% utilization`"
  >
    <!-- Active glow -->
    <div class="pointer-events-none absolute inset-0 rounded-2xl opacity-40" style="background: radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 60%)" />

    <div class="relative p-4 sm:p-5">
      <!-- Agent info -->
      <div class="mb-4 flex items-center gap-3">
        <div class="relative flex-shrink-0">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-xl text-xs font-bold ring-1 transition-transform duration-300 group-hover:scale-105"
            :class="[agentColor(session.agent_name, false).bg, agentColor(session.agent_name, false).text, agentColor(session.agent_name, false).ring]"
          >
            {{ agentInitials(session.agent_name) }}
          </div>
          <!-- Pulse ring on active -->
          <span class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-surface-card">
            <span class="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-50" />
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-sm font-semibold text-white">{{ session.agent_name }}</h3>
          <p class="text-xs text-gray-500">Session active</p>
        </div>
        <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg bg-gray-900/60 px-2.5 py-2 text-center">
          <div class="text-sm font-bold tabular-nums text-white">{{ session.task_count }}</div>
          <div class="text-[10px] font-medium text-gray-600">Tasks</div>
        </div>
        <div class="rounded-lg bg-gray-900/60 px-2.5 py-2 text-center">
          <div class="text-sm font-bold tabular-nums text-emerald-400">{{ formatIdleShort(session.last_used, nowMs) }}</div>
          <div class="text-[10px] font-medium text-gray-600">Uptime</div>
        </div>
        <div class="rounded-lg bg-gray-900/60 px-2.5 py-2 text-center">
          <div class="text-sm font-bold tabular-nums text-shazam-400">{{ utilizationPercent }}%</div>
          <div class="text-[10px] font-medium text-gray-600">Share</div>
        </div>
      </div>

      <!-- Activity bar -->
      <div class="mt-3">
        <div class="h-1 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-progress-fill"
            :style="{ width: `${Math.max(utilizationPercent, 8)}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-card {
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
</style>
