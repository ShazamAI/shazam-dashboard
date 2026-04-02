<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';

interface Props {
  data: {
    name: string;
    role: string;
    status: string;
    domain?: string;
    currentTask?: string | null;
    tasksCompleted: number;
    tasksFailed: number;
    tasksPending?: number;
    tasksRunning?: number;
    subagentCount?: number;
  };
}

const props = defineProps<Props>();

const statusColor: Record<string, string> = {
  idle: 'bg-gray-500',
  busy: 'bg-green-400 animate-pulse',
  working: 'bg-green-400 animate-pulse',
  executing: 'bg-blue-400 animate-pulse',
  waiting: 'bg-yellow-400',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
  offline: 'bg-gray-600',
};

const roleBg: Record<string, string> = {
  'Engineering Manager': 'from-purple-500/20 to-purple-900/10 border-purple-500/30',
  'Project Manager': 'from-blue-500/20 to-blue-900/10 border-blue-500/30',
  'Senior Developer': 'from-green-500/20 to-green-900/10 border-green-500/30',
  'Senior Elixir Developer': 'from-green-500/20 to-green-900/10 border-green-500/30',
  'Senior Frontend Developer': 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30',
  'QA Engineer': 'from-orange-500/20 to-orange-900/10 border-orange-500/30',
};

const bgClass = roleBg[props.data.role] || 'from-gray-500/20 to-gray-900/10 border-gray-500/30';
</script>

<template>
  <div
    role="article"
    :aria-label="'Agent ' + data.name + ', status: ' + data.status"
    class="rounded-xl border bg-gradient-to-b px-4 py-3 shadow-lg min-w-[180px] max-w-[220px] relative cursor-pointer"
    :class="bgClass"
  >
    <Handle type="target" :position="Position.Top" class="!bg-gray-600 !w-2 !h-2" />

    <!-- Notification badges (top right) -->
    <div class="absolute -top-1.5 -right-1.5 flex gap-1">
      <span
        v-if="data.tasksRunning && data.tasksRunning > 0"
        class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white shadow-sm"
        title="Running tasks"
      >{{ data.tasksRunning }}</span>
      <span
        v-if="data.tasksPending && data.tasksPending > 0"
        class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-yellow-500 px-1 text-[9px] font-bold text-gray-900 shadow-sm"
        title="Pending tasks"
      >{{ data.tasksPending }}</span>
      <span
        v-if="data.tasksFailed > 0"
        class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm"
        title="Failed tasks"
      >{{ data.tasksFailed }}</span>
      <span
        v-if="data.subagentCount && data.subagentCount > 0"
        class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500 px-1 text-[9px] font-bold text-white shadow-sm"
        :title="`${data.subagentCount} subagents`"
      >{{ data.subagentCount }}</span>
    </div>

    <!-- Header -->
    <div class="flex items-center gap-2 mb-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/60 text-sm">⚡</div>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-semibold text-white truncate">{{ data.name }}</div>
        <div class="text-[10px] text-gray-400 truncate">{{ data.role }}</div>
      </div>
      <div class="h-2.5 w-2.5 rounded-full shrink-0" :class="statusColor[data.status] || 'bg-gray-500'" />
    </div>

    <!-- Domain badge -->
    <div v-if="data.domain" class="mb-2">
      <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-800/60 text-gray-400 uppercase tracking-wider">
        {{ data.domain }}
      </span>
    </div>

    <!-- Current task -->
    <div v-if="data.currentTask" class="text-[10px] text-gray-300 bg-gray-800/40 rounded-lg px-2 py-1 mb-2 truncate">
      🔧 {{ data.currentTask }}
    </div>

    <!-- Stats -->
    <div class="flex gap-3 text-[10px] text-gray-500">
      <span>✅ {{ data.tasksCompleted }}</span>
      <span class="text-[9px] text-gray-600">dbl-click: output</span>
    </div>

    <Handle type="source" :position="Position.Bottom" class="!bg-gray-600 !w-2 !h-2" />
  </div>
</template>
