<script setup lang="ts">
interface AgentScore {
  score: number;
  grade: string;
  completions: number;
  failures: number;
  success_rate: number;
  avg_duration_ms: number;
  total_tokens: number;
  cost_per_task: number;
  suggestion: string | null;
}

interface Props {
  agentName: string;
  score: AgentScore;
}

defineProps<Props>();

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-emerald-400';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-amber-400';
    case 'D': return 'text-orange-400';
    case 'F': return 'text-red-400';
    default: return 'text-gray-500';
  }
}

function gradeBg(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-500/10 border-emerald-500/20';
    case 'B': return 'bg-blue-500/10 border-blue-500/20';
    case 'C': return 'bg-amber-500/10 border-amber-500/20';
    case 'D': return 'bg-orange-500/10 border-orange-500/20';
    case 'F': return 'bg-red-500/10 border-red-500/20';
    default: return 'bg-gray-800 border-gray-700';
  }
}

function progressBarColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-400';
    case 'B': return 'bg-blue-400';
    case 'C': return 'bg-amber-400';
    case 'D': return 'bg-orange-400';
    case 'F': return 'bg-red-400';
    default: return 'bg-gray-500';
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
</script>

<template>
  <div class="rounded-xl border p-4" :class="gradeBg(score.grade)">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-white">{{ agentName }}</span>
        <span class="text-2xl font-bold" :class="gradeColor(score.grade)">{{ score.grade }}</span>
      </div>
      <span class="text-xs text-gray-500">{{ score.score }}/100</span>
    </div>

    <!-- Progress bar -->
    <div class="h-1.5 rounded-full bg-gray-800 mb-3 overflow-hidden">
      <div
        class="h-full rounded-full transition-all"
        :class="progressBarColor(score.grade)"
        :style="{ width: score.score + '%' }"
      />
    </div>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 gap-2 text-[10px]">
      <div>
        <span class="text-gray-500">Success</span>
        <p class="text-xs font-medium text-white">{{ score.success_rate }}%</p>
      </div>
      <div>
        <span class="text-gray-500">Avg Time</span>
        <p class="text-xs font-medium text-white">{{ formatDuration(score.avg_duration_ms) }}</p>
      </div>
      <div>
        <span class="text-gray-500">Tasks</span>
        <p class="text-xs font-medium text-white">{{ score.completions + score.failures }}</p>
      </div>
      <div>
        <span class="text-gray-500">Cost/Task</span>
        <p class="text-xs font-medium text-white">${{ score.cost_per_task.toFixed(3) }}</p>
      </div>
    </div>

    <!-- Suggestion -->
    <div v-if="score.suggestion" class="mt-3 rounded-lg bg-gray-900/50 px-3 py-2">
      <p class="text-[10px] text-amber-400/80">{{ score.suggestion }}</p>
    </div>
  </div>
</template>
