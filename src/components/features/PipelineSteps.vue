<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PipelineStage } from '@/types';

interface Props {
  stages: PipelineStage[];
  currentStage: number;
  workflowName?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectStage: [index: number];
}>();

const expandedStage = ref<number | null>(null);

function toggleStage(index: number) {
  if (expandedStage.value === index) {
    expandedStage.value = null;
  } else {
    expandedStage.value = index;
    emit('selectStage', index);
  }
}

const statusConfig: Record<string, { color: string; bg: string; icon: string; ring: string }> = {
  completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: '✓', ring: 'ring-emerald-500/30' },
  in_progress: { color: 'text-blue-400', bg: 'bg-blue-500/15', icon: '●', ring: 'ring-blue-500/30' },
  pending: { color: 'text-gray-500', bg: 'bg-gray-800/50', icon: '○', ring: 'ring-gray-700' },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/15', icon: '✗', ring: 'ring-red-500/30' },
};

const defaultConfig = { color: 'text-gray-500', bg: 'bg-gray-800/50', icon: '○', ring: 'ring-gray-700' };

function getConfig(status: string) {
  return statusConfig[status] ?? defaultConfig;
}

const progressPercent = computed(() => {
  const completed = props.stages.filter(s => s.status === 'completed').length;
  return Math.round((completed / props.stages.length) * 100);
});

const expandedStageData = computed(() => {
  if (expandedStage.value === null) return null;
  return props.stages[expandedStage.value] ?? null;
});
</script>

<template>
  <div class="pipeline-steps">
    <!-- Header -->
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Pipeline</span>
        <span v-if="workflowName" class="rounded-md bg-shazam-500/10 px-1.5 py-0.5 text-[10px] font-medium text-shazam-400 ring-1 ring-shazam-500/20">
          {{ workflowName }}
        </span>
      </div>
      <span class="text-[10px] tabular-nums text-gray-600">
        {{ stages.filter(s => s.status === 'completed').length }}/{{ stages.length }} stages
      </span>
    </div>

    <!-- Progress bar -->
    <div class="mb-3 h-1 overflow-hidden rounded-full bg-gray-800">
      <div
        class="h-full rounded-full bg-gradient-to-r from-shazam-500 to-emerald-500 transition-all duration-500"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- Steps -->
    <div class="flex items-start gap-0">
      <template v-for="(stage, index) in stages" :key="index">
        <!-- Step -->
        <button
          class="group relative flex flex-1 flex-col items-center gap-1.5 py-1 transition-all"
          :class="expandedStage === index ? 'scale-105' : ''"
          @click="toggleStage(index)"
        >
          <!-- Circle -->
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 transition-all duration-300"
            :class="[
              getConfig(stage.status).bg,
              getConfig(stage.status).color,
              getConfig(stage.status).ring,
              index === currentStage ? 'scale-110 shadow-lg' : '',
            ]"
          >
            <span v-if="stage.status === 'completed'">✓</span>
            <span v-else-if="stage.status === 'in_progress'" class="animate-pulse">●</span>
            <span v-else-if="stage.status === 'rejected'">✗</span>
            <span v-else class="text-[10px]">{{ index + 1 }}</span>
          </div>

          <!-- Label -->
          <span
            class="max-w-[80px] truncate text-center text-[10px] font-medium leading-tight transition-colors"
            :class="index === currentStage ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'"
          >
            {{ stage.name }}
          </span>

          <!-- Role -->
          <span class="text-[9px] text-gray-600">{{ stage.role }}</span>

          <!-- Completed by -->
          <span
            v-if="stage.completed_by"
            class="text-[9px] text-gray-600"
          >
            {{ stage.completed_by }}
          </span>
        </button>

        <!-- Connector -->
        <div
          v-if="index < stages.length - 1"
          class="mt-3.5 h-0.5 w-4 shrink-0 rounded-full transition-colors sm:w-6"
          :class="stage.status === 'completed' ? 'bg-emerald-500/40' : 'bg-gray-800'"
        />
      </template>
    </div>

    <!-- Expanded Stage Detail -->
    <Transition name="stage-detail">
      <div
        v-if="expandedStageData"
        class="mt-3 rounded-lg border border-gray-800/60 bg-gray-900/50 p-3"
      >
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-200">
              {{ expandedStageData.name }}
            </span>
            <span
              class="rounded px-1.5 py-0.5 text-[10px] font-medium"
              :class="[getConfig(expandedStageData.status).bg, getConfig(expandedStageData.status).color]"
            >
              {{ expandedStageData.status }}
            </span>
          </div>
          <button
            class="text-gray-600 hover:text-gray-400"
            @click="expandedStage = null"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="expandedStageData.completed_by" class="mb-1.5 text-[11px] text-gray-500">
          Completed by: <span class="text-gray-300">{{ expandedStageData.completed_by }}</span>
        </div>

        <div
          v-if="expandedStageData.output"
          class="max-h-40 overflow-y-auto rounded border border-gray-800/40 bg-gray-950 p-2 scrollbar-thin"
        >
          <pre class="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-400">{{ expandedStageData.output }}</pre>
        </div>

        <p v-else class="text-[11px] italic text-gray-600">No output yet</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pipeline-steps {
  animation: pipelineIn 0.4s ease-out;
}

@keyframes pipelineIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.stage-detail-enter-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.stage-detail-leave-active {
  transition: all 0.15s ease-in;
}
.stage-detail-enter-from,
.stage-detail-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}
.stage-detail-enter-to,
.stage-detail-leave-from {
  max-height: 300px;
}
</style>
