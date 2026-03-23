<script setup lang="ts">
import type { RalphLoopConfig } from '@/types';
import AppButton from '@/components/common/Button.vue';

interface Props {
  editableConfig: RalphLoopConfig;
  isSaving: boolean;
  saveSuccess: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  save: [];
}>();

const toggleFields = [
  { key: 'auto_approve' as const, label: 'Auto Approve', desc: 'Subtasks execute immediately without human approval', icon: '✅' },
  { key: 'module_lock' as const, label: 'Module Lock', desc: 'Prevent concurrent edits to same file', icon: '🔒' },
  { key: 'peer_reassign' as const, label: 'Peer Reassign', desc: 'Assign tasks to idle peers when agent is busy', icon: '🔄' },
  { key: 'auto_retry' as const, label: 'Auto Retry', desc: 'Retry failed tasks with exponential backoff', icon: '♻️' },
];

const numberFields = [
  { key: 'max_concurrent' as const, label: 'Max Concurrent', desc: 'Maximum parallel agent executions', min: 1, max: 16, step: 1, icon: '⚡' },
  { key: 'max_retries' as const, label: 'Max Retries', desc: 'Retry attempts before giving up', min: 0, max: 10, step: 1, icon: '🔁' },
  { key: 'poll_interval' as const, label: 'Poll Interval', desc: 'Task polling interval (ms)', min: 1000, max: 60000, step: 1000, icon: '⏱️' },
  { key: 'context_history' as const, label: 'Context History', desc: 'Last N tasks per agent for context', min: 1, max: 50, step: 1, icon: '📚' },
  { key: 'team_activity' as const, label: 'Team Activity', desc: 'Last N team tasks for context', min: 1, max: 100, step: 1, icon: '👥' },
  { key: 'context_budget' as const, label: 'Context Budget', desc: 'Max chars injected into prompt', min: 500, max: 50000, step: 500, icon: '💰' },
];
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-gray-800/60 bg-surface-card">
      <!-- Header with save -->
      <div class="flex flex-col gap-3 border-b border-gray-800/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <h2 class="section-title">RalphLoop Configuration</h2>
          <p class="section-subtitle">Controls the task execution loop behavior</p>
        </div>
        <div class="flex items-center gap-3">
          <Transition name="v-fade" mode="out-in">
            <span v-if="saveSuccess" class="flex items-center gap-1 text-xs font-medium text-emerald-400">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Saved
            </span>
          </Transition>
          <AppButton variant="primary" size="sm" :loading="isSaving" @click="emit('save')">
            Save Changes
          </AppButton>
        </div>
      </div>

      <div class="p-4 sm:p-6">
        <!-- Toggle section -->
        <div class="mb-6">
          <h3 class="micro-label mb-3">Feature Flags</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              v-for="toggle in toggleFields"
              :key="toggle.key"
              class="group flex items-center justify-between rounded-xl border border-gray-800/50 bg-surface p-3.5 transition-all duration-200 hover:border-gray-700/50 sm:p-4"
            >
              <div class="flex items-center gap-3">
                <span class="text-sm">{{ toggle.icon }}</span>
                <div>
                  <p class="text-sm font-medium text-gray-200">{{ toggle.label }}</p>
                  <p class="text-[10px] text-gray-500 sm:text-xs">{{ toggle.desc }}</p>
                </div>
              </div>
              <!-- Toggle switch -->
              <button
                class="relative h-6 w-11 shrink-0 rounded-full transition-all duration-250"
                :class="editableConfig[toggle.key]
                  ? 'bg-shazam-500 shadow-glow-sm'
                  : 'bg-gray-700 hover:bg-gray-600'"
                role="switch"
                :aria-checked="editableConfig[toggle.key]"
                @click="editableConfig[toggle.key] = !editableConfig[toggle.key]"
              >
                <span
                  class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                  :class="editableConfig[toggle.key] ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Number fields section -->
        <div>
          <h3 class="micro-label mb-3">Parameters</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="field in numberFields"
              :key="field.key"
              class="rounded-xl border border-gray-800/50 bg-surface p-3.5 transition-all duration-200 hover:border-gray-700/50 sm:p-4"
            >
              <div class="mb-2.5 flex items-center gap-2">
                <span class="text-sm">{{ field.icon }}</span>
                <div>
                  <label class="block text-sm font-medium text-gray-200">{{ field.label }}</label>
                  <p class="text-[10px] text-gray-500 sm:text-xs">{{ field.desc }}</p>
                </div>
              </div>
              <input
                v-model.number="editableConfig[field.key]"
                type="number"
                :min="field.min"
                :max="field.max"
                :step="field.step"
                class="input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
