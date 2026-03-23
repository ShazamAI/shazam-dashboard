<script setup lang="ts">
import AppButton from '@/components/common/Button.vue';
import type { AgentWorker, CreateTaskPayload } from '@/types';

interface Props {
  createForm: CreateTaskPayload;
  isCreating: boolean;
  companyName: string | null;
  agents: AgentWorker[];
}

defineProps<Props>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();
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
