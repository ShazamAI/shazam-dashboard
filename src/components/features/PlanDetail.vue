<script setup lang="ts">
import { computed } from 'vue';
import AppButton from '@/components/common/Button.vue';
import { formatFullDate, statusBadgeClass } from '@/utils/formatters';
import type { Plan, PlanTask } from '@/types';

const props = defineProps<{
  plan: Plan;
  isEditing: boolean;
  isSaving: boolean;
  isRefining: boolean;
  editTitle: string;
  editSummary: string;
  editTasks: PlanTask[];
  showRefineForm: boolean;
  showDeleteConfirm: boolean;
  refineFeedback: string;
}>();

const emit = defineEmits<{
  'update:editTitle': [value: string];
  'update:editSummary': [value: string];
  'update:showRefineForm': [value: boolean];
  'update:showDeleteConfirm': [value: boolean];
  'update:refineFeedback': [value: string];
  startEdit: [];
  cancelEdit: [];
  saveDraft: [];
  approve: [];
  refine: [];
  delete: [];
  updateTaskField: [phaseKey: string, taskIdx: number, field: keyof PlanTask, value: string];
}>();

const isDraft = computed(() => props.plan.status === 'draft');

// Group tasks by phase
const tasksByPhase = computed(() => {
  const tasks = props.isEditing ? props.editTasks : (props.plan.tasks ?? []);
  const grouped = new Map<string, PlanTask[]>();
  for (const task of tasks) {
    const phase = task.phase ?? 'Ungrouped';
    if (!grouped.has(phase)) grouped.set(phase, []);
    grouped.get(phase)!.push(task);
  }
  return grouped;
});


</script>

<template>
  <!-- Toolbar -->
  <div class="flex items-center justify-between border-b border-gray-800 bg-gray-900/30 px-6 py-3">
    <div class="flex items-center gap-3 min-w-0">
      <h1 v-if="!isEditing" class="text-sm font-semibold text-white truncate">
        {{ plan.title }}
      </h1>
      <input
        v-else
        :value="editTitle"
        class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1 text-sm font-semibold text-white focus:border-shazam-500/50 focus:outline-none"
        @input="emit('update:editTitle', ($event.target as HTMLInputElement).value)"
      />
      <span
        class="shrink-0 inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium"
        :class="statusBadgeClass(plan.status)"
      >
        {{ plan.status }}
      </span>
      <span v-if="isEditing" class="shrink-0 rounded-md bg-shazam-500/20 px-2 py-0.5 text-[10px] font-medium text-shazam-400">
        editing
      </span>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <template v-if="isEditing">
        <AppButton variant="secondary" size="xs" aria-label="Cancel editing" @click="emit('cancelEdit')">Cancel</AppButton>
        <AppButton variant="primary" size="xs" aria-label="Save draft changes" :loading="isSaving" @click="emit('saveDraft')">Save Draft</AppButton>
      </template>
      <template v-else>
        <AppButton variant="primary" size="xs" aria-label="Edit plan" @click="emit('startEdit')">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit
        </AppButton>
        <AppButton variant="secondary" size="xs" aria-label="Refine plan" @click="emit('update:showRefineForm', !showRefineForm)">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          Refine
        </AppButton>
        <AppButton variant="primary" size="xs" aria-label="Approve plan" :loading="isSaving" @click="emit('approve')">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {{ isDraft ? 'Approve Plan' : 'Re-approve Plan' }}
        </AppButton>
        <AppButton variant="danger" size="xs" aria-label="Delete plan" @click="emit('update:showDeleteConfirm', true)">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </AppButton>
      </template>
    </div>
  </div>

  <!-- Refine feedback form -->
  <div v-if="showRefineForm" class="border-b border-gray-800 bg-gray-900/50 px-6 py-3 space-y-2">
    <p class="text-xs text-gray-400">Tell the AI what to change or improve:</p>
    <textarea
      :value="refineFeedback"
      class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-shazam-500/50 focus:outline-none resize-none"
      placeholder="e.g. Add more test coverage tasks, split the frontend work into smaller steps..."
      rows="3"
      @input="emit('update:refineFeedback', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="flex gap-2">
      <AppButton variant="secondary" size="xs" @click="emit('update:showRefineForm', false)">Cancel</AppButton>
      <AppButton variant="primary" size="xs" :loading="isRefining" :disabled="!refineFeedback.trim()" @click="emit('refine')">
        Send Feedback
      </AppButton>
    </div>
  </div>

  <!-- Delete confirmation -->
  <div v-if="showDeleteConfirm" class="border-b border-red-900/30 bg-red-950/20 px-6 py-3 flex items-center gap-3">
    <p class="text-xs text-red-400">Are you sure you want to delete this plan? This cannot be undone.</p>
    <div class="flex gap-2 shrink-0">
      <AppButton variant="secondary" size="xs" @click="emit('update:showDeleteConfirm', false)">Cancel</AppButton>
      <AppButton variant="danger" size="xs" :loading="isSaving" @click="emit('delete')">Delete</AppButton>
    </div>
  </div>

  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">
    <!-- Summary / Description -->
    <div>
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
      <textarea
        v-if="isEditing"
        :value="editSummary"
        class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-300 font-mono leading-relaxed focus:border-shazam-500/50 focus:outline-none resize-y min-h-[120px]"
        rows="8"
        placeholder="Describe the plan in detail... Supports markdown formatting."
        @input="emit('update:editSummary', ($event.target as HTMLTextAreaElement).value)"
      />
      <div v-else-if="plan.summary" class="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3">
        <pre class="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">{{ plan.summary }}</pre>
      </div>
      <p v-else class="text-xs text-gray-600 italic">No description yet. Click Edit to add one.</p>
    </div>

    <!-- Meta info -->
    <div class="flex items-center gap-4 text-[10px] text-gray-600">
      <span>Created {{ formatFullDate(plan.created_at) }}</span>
      <span>{{ plan.tasks?.length ?? 0 }} tasks</span>
    </div>

    <!-- Tasks by phase -->
    <div>
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tasks</h3>
      <div v-if="tasksByPhase.size === 0" class="text-xs text-gray-600">No tasks in this plan.</div>
      <div v-for="[phase, tasks] in tasksByPhase" :key="phase" class="mb-5">
        <div class="flex items-center gap-2 mb-2">
          <div class="h-1.5 w-1.5 rounded-full bg-shazam-400" />
          <h4 class="text-xs font-semibold text-gray-300">{{ phase }}</h4>
          <span class="text-[9px] text-gray-600">{{ tasks.length }} tasks</span>
        </div>
        <!-- Phase goal -->
        <p v-if="tasks[0]?.phase_goal" class="text-[10px] text-gray-500 ml-3.5 mb-2 italic">
          {{ tasks[0].phase_goal }}
        </p>
        <div class="space-y-2 ml-3.5">
          <div
            v-for="(task, ti) in tasks"
            :key="ti"
            class="rounded-lg border border-gray-800 bg-gray-900/50 p-3 transition-colors hover:border-gray-700"
          >
            <template v-if="isEditing">
              <input
                :value="task.title"
                class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs font-medium text-white focus:border-shazam-500/50 focus:outline-none mb-1.5"
                placeholder="Task title"
                @input="emit('updateTaskField', phase, ti, 'title', ($event.target as HTMLInputElement).value)"
              />
              <div class="flex gap-2 mb-1.5">
                <input
                  :value="task.assigned_to"
                  class="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-400 focus:border-shazam-500/50 focus:outline-none"
                  placeholder="Assigned to"
                  @input="emit('updateTaskField', phase, ti, 'assigned_to', ($event.target as HTMLInputElement).value)"
                />
                <input
                  :value="task.depends_on ?? ''"
                  class="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-400 focus:border-shazam-500/50 focus:outline-none"
                  placeholder="Depends on"
                  @input="emit('updateTaskField', phase, ti, 'depends_on', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <textarea
                :value="task.description"
                class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-400 focus:border-shazam-500/50 focus:outline-none resize-none"
                rows="2"
                placeholder="Description"
                @input="emit('updateTaskField', phase, ti, 'description', ($event.target as HTMLTextAreaElement).value)"
              />
            </template>
            <template v-else>
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs font-medium text-white">{{ task.title }}</p>
              </div>
              <div class="flex items-center gap-3 mt-1">
                <span class="inline-flex items-center gap-1 text-[10px] text-gray-500">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  {{ task.assigned_to }}
                </span>
                <span v-if="task.depends_on" class="inline-flex items-center gap-1 text-[10px] text-gray-600">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.282a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                  </svg>
                  depends on: {{ task.depends_on }}
                </span>
              </div>
              <p v-if="task.description" class="mt-1.5 text-[10px] text-gray-500 leading-relaxed">
                {{ task.description }}
              </p>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Architecture section -->
    <div v-if="plan.architecture" class="space-y-4">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Architecture</h3>

      <!-- Files created -->
      <div v-if="plan.architecture.files_created?.length">
        <h4 class="text-[10px] font-medium text-gray-400 mb-1.5">Files Created</h4>
        <div class="space-y-1">
          <div
            v-for="file in plan.architecture.files_created"
            :key="file"
            class="flex items-center gap-2 rounded-md bg-green-500/5 border border-green-500/10 px-2.5 py-1.5"
          >
            <svg class="h-3.5 w-3.5 text-green-500/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span class="text-[10px] text-green-400 font-mono truncate">{{ file }}</span>
          </div>
        </div>
      </div>

      <!-- Files modified -->
      <div v-if="plan.architecture.files_modified?.length">
        <h4 class="text-[10px] font-medium text-gray-400 mb-1.5">Files Modified</h4>
        <div class="space-y-1">
          <div
            v-for="file in plan.architecture.files_modified"
            :key="file"
            class="flex items-center gap-2 rounded-md bg-amber-500/5 border border-amber-500/10 px-2.5 py-1.5"
          >
            <svg class="h-3.5 w-3.5 text-amber-500/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            <span class="text-[10px] text-amber-400 font-mono truncate">{{ file }}</span>
          </div>
        </div>
      </div>

      <!-- Decisions -->
      <div v-if="plan.architecture.decisions?.length">
        <h4 class="text-[10px] font-medium text-gray-400 mb-1.5">Decisions</h4>
        <div class="space-y-1.5">
          <div
            v-for="(d, di) in plan.architecture.decisions"
            :key="di"
            class="rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2"
          >
            <p class="text-[10px] font-medium text-white">{{ d.decision }}</p>
            <p class="text-[10px] text-gray-500 mt-0.5">{{ d.reason }}</p>
          </div>
        </div>
      </div>

      <!-- Dependencies -->
      <div v-if="plan.architecture.dependencies?.length">
        <h4 class="text-[10px] font-medium text-gray-400 mb-1.5">Dependencies</h4>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="dep in plan.architecture.dependencies"
            :key="dep"
            class="inline-flex rounded-md bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400 font-mono"
          >
            {{ dep }}
          </span>
        </div>
      </div>
    </div>

    <!-- Risks section -->
    <div v-if="plan.risks?.length">
      <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Risks</h3>
      <div class="space-y-2">
        <div
          v-for="(r, ri) in plan.risks"
          :key="ri"
          class="rounded-lg border border-red-900/20 bg-red-950/10 p-3"
        >
          <div class="flex items-start gap-2">
            <svg class="h-3.5 w-3.5 text-red-500/60 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p class="text-[10px] font-medium text-red-400">{{ r.risk }}</p>
              <p class="text-[10px] text-gray-500 mt-0.5">Mitigation: {{ r.mitigation }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
