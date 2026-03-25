<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';

interface PipelineStageData {
  name: string;
  status: string;
}

interface Props {
  data: {
    id: string;
    title: string;
    status: string;
    assignedTo: string;
    pipeline?: PipelineStageData[] | null;
    currentStage?: number | null;
  };
}

defineProps<Props>();
const emit = defineEmits<{ approve: [id: string]; reject: [id: string] }>();

const statusStyle: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-gray-800/60', text: 'text-gray-400', border: 'border-gray-600' },
  in_progress: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/40' },
  completed: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/40' },
  failed: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/40' },
  awaiting_approval: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/40 animate-pulse' },
  paused: { bg: 'bg-gray-800/60', text: 'text-yellow-500', border: 'border-yellow-600/30' },
};

const statusIcon: Record<string, string> = {
  pending: '⏳', in_progress: '🔧', completed: '✅', failed: '❌',
  awaiting_approval: '🔔', paused: '⏸️',
};
</script>

<template>
  <div
    class="rounded-lg border px-3 py-2 shadow-md min-w-[160px] max-w-[200px]"
    :class="[
      statusStyle[data.status]?.bg || 'bg-gray-800/60',
      statusStyle[data.status]?.border || 'border-gray-600',
    ]"
  >
    <Handle type="target" :position="Position.Top" class="!bg-gray-600 !w-2 !h-2" />

    <div class="flex items-start gap-2">
      <span class="text-sm mt-0.5">{{ statusIcon[data.status] || '📋' }}</span>
      <div class="min-w-0 flex-1">
        <div class="text-xs font-medium text-white truncate">{{ data.title }}</div>
        <div class="text-[10px] mt-0.5" :class="statusStyle[data.status]?.text || 'text-gray-400'">
          {{ data.status.replace('_', ' ') }} · {{ data.assignedTo }}
        </div>
      </div>
    </div>

    <!-- Pipeline mini progress -->
    <div v-if="data.pipeline && data.pipeline.length > 1" class="flex gap-0.5 mt-1.5">
      <div
        v-for="(s, si) in data.pipeline"
        :key="si"
        class="h-1 flex-1 rounded-full"
        :class="{
          'bg-green-500': s.status === 'completed',
          'bg-blue-500 animate-pulse': s.status === 'in_progress',
          'bg-red-500': s.status === 'rejected',
          'bg-gray-700': s.status === 'pending',
        }"
        :title="s.name"
      />
    </div>
    <div v-if="data.pipeline && data.pipeline.length > 1 && data.currentStage != null" class="mt-0.5 text-[9px] text-gray-600">
      {{ data.pipeline[data.currentStage]?.name }} ({{ (data.currentStage ?? 0) + 1 }}/{{ data.pipeline.length }})
    </div>

    <!-- Approve/Reject for awaiting tasks -->
    <div v-if="data.status === 'awaiting_approval'" class="flex gap-1 mt-2">
      <button
        class="flex-1 rounded bg-green-500/20 px-2 py-0.5 text-[10px] text-green-400 hover:bg-green-500/30"
        @click.stop="emit('approve', data.id)"
      >Approve</button>
      <button
        class="flex-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/30"
        @click.stop="emit('reject', data.id)"
      >Reject</button>
    </div>

    <Handle type="source" :position="Position.Bottom" class="!bg-gray-600 !w-2 !h-2" />
  </div>
</template>
