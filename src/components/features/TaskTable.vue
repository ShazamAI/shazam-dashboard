<script setup lang="ts">
import { computed } from 'vue';
import TaskRow from '@/components/features/TaskRow.vue';
import TaskMobileCard from '@/components/features/TaskMobileCard.vue';
import type { Task } from '@/types';

interface Props {
  tasks: Task[];
  selectedTaskId: string | null;
  isPageLoading: boolean;
  currentPage: number;
  actionLoading: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [task: Task];
  navigateAgent: [name: string];
  action: [taskId: string, action: string];
}>();

const hasAnyPipeline = computed(() =>
  props.tasks.some(t => Array.isArray(t.pipeline) && t.pipeline.length > 1)
);
</script>

<template>
  <div>
    <!-- Page loading indicator -->
    <Transition name="v-fade">
      <div
        v-if="isPageLoading"
        class="mb-3 flex items-center justify-center gap-2 rounded-xl border border-shazam-500/20 bg-shazam-500/5 py-2.5 text-xs font-medium text-shazam-400"
      >
        <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading page {{ currentPage }}...
      </div>
    </Transition>

    <!-- Desktop table -->
    <div
      class="card hidden overflow-hidden transition-opacity duration-200 md:block"
      :class="isPageLoading ? 'opacity-50 pointer-events-none' : ''"
    >
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-800 bg-gray-900/50">
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">ID</th>
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Title</th>
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Status</th>
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Agent</th>
            <th class="hidden px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 lg:table-cell sm:px-4 md:px-5">Created By</th>
            <th v-if="hasAnyPipeline" class="hidden px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 xl:table-cell sm:px-4 md:px-5">Stage</th>
            <th class="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Updated</th>
            <th class="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:px-4 md:px-5">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800/40">
          <TaskRow
            v-for="task in tasks"
            :key="task.id"
            :task="task"
            :selected="selectedTaskId === task.id"
            :action-loading="actionLoading"
            :show-pipeline-column="hasAnyPipeline"
            @select="emit('select', $event)"
            @navigate-agent="emit('navigateAgent', $event)"
            @action="(taskId: string, action: string) => emit('action', taskId, action)"
          />
        </tbody>
      </table>
    </div>

    <!-- Mobile card list -->
    <div class="space-y-2 md:hidden" :class="isPageLoading ? 'opacity-50 pointer-events-none' : ''">
      <TaskMobileCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :selected="selectedTaskId === task.id"
        :action-loading="actionLoading"
        @select="emit('select', $event)"
        @navigate-agent="emit('navigateAgent', $event)"
        @action="(taskId: string, action: string) => emit('action', taskId, action)"
      />
    </div>
  </div>
</template>
