<script setup lang="ts">
interface Props {
  isPaused: boolean;
  awaitingCount: number;
}

defineProps<Props>();

const emit = defineEmits<{
  createTask: [];
  approveAll: [];
  pause: [];
  resume: [];
}>();
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      class="inline-flex items-center gap-2 rounded-xl border border-shazam-500/30 bg-shazam-500/10 px-4 py-2 text-xs font-medium text-shazam-400 transition-all hover:bg-shazam-500/20 hover:border-shazam-500/50"
      aria-label="Create a new task"
      @click="emit('createTask')"
    >
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Create Task
    </button>

    <button
      class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="awaitingCount === 0"
      aria-label="Approve all awaiting tasks"
      @click="emit('approveAll')"
    >
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Approve All
      <span v-if="awaitingCount > 0" class="rounded-full bg-emerald-500/20 px-1.5 text-[10px]">{{ awaitingCount }}</span>
    </button>

    <button
      v-if="!isPaused"
      class="inline-flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-medium text-yellow-400 transition-all hover:bg-yellow-500/20 hover:border-yellow-500/50"
      aria-label="Pause task loop"
      @click="emit('pause')"
    >
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
      </svg>
      Pause Loop
    </button>

    <button
      v-else
      class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50"
      aria-label="Resume task loop"
      @click="emit('resume')"
    >
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
      Resume
    </button>
  </div>
</template>
