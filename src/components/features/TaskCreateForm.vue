<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppButton from '@/components/common/Button.vue';
import { fetchWorkflows } from '@/api/taskService';
import type { AgentWorker, CreateTaskPayload, Workflow } from '@/types';

interface ComplexityWarning {
  reasons: string[];
  estimated: number;
}

interface Props {
  createForm: CreateTaskPayload;
  isCreating: boolean;
  companyName: string | null;
  agents: AgentWorker[];
  complexityWarning?: ComplexityWarning | null;
}

defineProps<Props>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
  forceCreate: [];
  decompose: [];
}>();

const workflows = ref<Workflow[]>([]);
const workflowLoadError = ref(false);

onMounted(async () => {
  try {
    workflows.value = await fetchWorkflows();
  } catch (err) {
    console.warn('Failed to load workflows:', err);
    workflowLoadError.value = true;
  }
});
</script>

<template>
  <div class="create-form card mb-5 overflow-hidden">
    <div class="card-header flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex h-6 w-6 items-center justify-center rounded-md bg-shazam-500/10 text-xs ring-1 ring-shazam-500/20">
          <svg class="h-3 w-3 text-shazam-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <h2 class="section-title text-sm">Create New Task</h2>
      </div>
      <AppButton variant="ghost" size="xs" @click="emit('cancel')">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </AppButton>
    </div>

    <form class="card-body space-y-4" @submit.prevent="emit('submit')">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="form-label">Company</label>
          <p class="input cursor-default bg-gray-900 text-gray-400">{{ companyName ?? 'No company active' }}</p>
        </div>
        <div>
          <label class="form-label">Assign To</label>
          <select v-model="createForm.assigned_to" class="select w-full">
            <option value="">Unassigned</option>
            <option v-for="agent in agents" :key="agent.name" :value="agent.name">{{ agent.name }} ({{ agent.role }})</option>
          </select>
        </div>
      </div>

      <!-- Workflow selector -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="form-label">Workflow</label>
          <select v-model="createForm.workflow" class="select w-full">
            <option value="">No workflow (single stage)</option>
            <option v-for="w in workflows" :key="w.name" :value="w.name">
              {{ w.name }} ({{ w.stages.length }} stages)
            </option>
          </select>
          <p v-if="workflowLoadError" class="mt-1 text-xs text-yellow-500">Failed to load workflows. You can still create a task without one.</p>
        </div>
        <div v-if="createForm.workflow">
          <label class="form-label">Pipeline Preview</label>
          <div class="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
            <template v-for="(w, wi) in workflows.find(w => w.name === createForm.workflow)?.stages ?? []" :key="wi">
              <span class="text-[10px] text-gray-400">{{ w.name }}</span>
              <svg v-if="wi < (workflows.find(w2 => w2.name === createForm.workflow)?.stages.length ?? 0) - 1" class="h-3 w-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </template>
          </div>
        </div>
      </div>

      <div>
        <label class="form-label">Title *</label>
        <input v-model="createForm.title" type="text" placeholder="Describe the task..." class="input" />
      </div>
      <div>
        <label class="form-label">Description</label>
        <textarea v-model="createForm.description" rows="3" placeholder="Detailed description (optional)..." class="input" />
      </div>
      <div>
        <label class="form-label">Depends On (task title)</label>
        <input v-model="createForm.depends_on" type="text" placeholder="Title of dependency task (optional)" class="input" />
      </div>
      <!-- Complexity Warning -->
      <div v-if="complexityWarning" class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-amber-400 text-sm">&#9889;</span>
          <p class="text-xs font-medium text-amber-400">This task looks complex</p>
        </div>
        <ul class="text-[10px] text-amber-400/70 space-y-0.5 ml-5 list-disc">
          <li v-for="reason in complexityWarning.reasons" :key="reason">{{ reason }}</li>
        </ul>
        <p class="text-[10px] text-amber-400/70">
          Suggestion: Let the PM break this into ~{{ complexityWarning.estimated }} subtasks for better results.
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg bg-shazam-500 px-3 py-1 text-[10px] text-white hover:bg-shazam-600 transition-colors"
            :disabled="isCreating"
            @click="emit('decompose')"
          >
            Let PM Decompose
          </button>
          <button
            type="button"
            class="rounded-lg border border-gray-700 px-3 py-1 text-[10px] text-gray-400 hover:text-gray-300 hover:border-gray-600 transition-colors"
            :disabled="isCreating"
            @click="emit('forceCreate')"
          >
            Create Anyway
          </button>
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-gray-800 pt-4">
        <AppButton variant="secondary" size="sm" type="button" @click="emit('cancel')">Cancel</AppButton>
        <AppButton variant="primary" size="sm" type="submit" :loading="isCreating" :disabled="isCreating || !createForm.title.trim() || !companyName">
          Create Task
        </AppButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.create-form {
  animation: formSlideDown 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes formSlideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 600px;
  }
}
</style>
