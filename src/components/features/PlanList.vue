<script setup lang="ts">
import AppButton from '@/components/common/Button.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { statusBadgeClass } from '@/utils/formatters';
import type { Plan } from '@/types';

defineProps<{
  plans: Plan[];
  isLoading: boolean;
  selectedPlanId: string | null;
  showCreateForm: boolean;
  createDescription: string;
  isCreating: boolean;
}>();

const emit = defineEmits<{
  'update:showCreateForm': [value: boolean];
  'update:createDescription': [value: string];
  selectPlan: [id: string];
  create: [];
}>();
</script>

<template>
  <div class="w-72 shrink-0 border-r border-gray-800 bg-gray-900/50 flex flex-col">
    <div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
      <h2 class="text-sm font-semibold text-white">Plans</h2>
      <AppButton variant="primary" size="xs" :aria-label="showCreateForm ? 'Cancel creating plan' : 'Create new plan'" @click="emit('update:showCreateForm', !showCreateForm)">
        <svg v-if="!showCreateForm" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        {{ showCreateForm ? 'Cancel' : 'New' }}
      </AppButton>
    </div>

    <!-- Create form -->
    <div v-if="showCreateForm" class="border-b border-gray-800 px-4 py-3 space-y-2">
      <textarea
        :value="createDescription"
        class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-shazam-500/50 focus:outline-none resize-none"
        placeholder="Describe what you want to build..."
        rows="4"
        @input="emit('update:createDescription', ($event.target as HTMLTextAreaElement).value)"
      />
      <AppButton
        variant="primary"
        size="xs"
        :loading="isCreating"
        :disabled="!createDescription.trim()"
        class="w-full"
        aria-label="Submit plan creation"
        @click="emit('create')"
      >
        Create Plan
      </AppButton>
    </div>

    <LoadingSpinner v-if="isLoading" label="Loading..." />

    <!-- Plan list -->
    <div v-else class="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin">
      <div v-if="plans.length === 0" class="px-4 py-8 text-center text-xs text-gray-600">
        No plans yet. Create one to get started.
      </div>
      <button
        v-for="p in plans"
        :key="p.id"
        class="flex w-full items-start gap-3 px-4 py-3 text-left transition-all"
        :class="selectedPlanId === p.id
          ? 'bg-shazam-500/10 text-shazam-400 border-l-2 border-shazam-500'
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 border-l-2 border-transparent'"
        :aria-label="`Select plan: ${p.title}`"
        @click="emit('selectPlan', p.id)"
      >
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium truncate">{{ p.title }}</p>
          <div class="flex items-center gap-2 mt-1">
            <span
              class="inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-medium"
              :class="statusBadgeClass(p.status)"
            >
              {{ p.status }}
            </span>
            <span class="text-[9px] text-gray-600">{{ p.tasks?.length ?? 0 }} tasks</span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
