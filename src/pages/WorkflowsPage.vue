<script setup lang="ts">
import { onMounted } from 'vue';
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { useWorkflowEditor } from '@/composables/useWorkflowEditor';
import WorkflowStageNode from '@/components/canvas/WorkflowStageNode.vue';
import AppButton from '@/components/common/Button.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

import ErrorBoundary from '@/components/common/ErrorBoundary.vue';

const {
  workflows,
  isLoading,
  loadError,
  selectedName,
  isEditing,
  isSaving,
  showNewForm,
  showDeleteConfirm,
  newName,
  nodes,
  edges,
  selectedWorkflow,
  isBuiltIn,
  load,
  startEdit,
  cancelEdit,
  updateStage,
  removeStage,
  addStage,
  save,
  handleCreate,
  confirmDelete,
  cancelDelete,
  handleDelete,
  roleDot,
} = useWorkflowEditor();

onMounted(load);
</script>

<template>
  <div class="workflows-page flex h-[calc(100vh-64px)]">
    <!-- Left sidebar: workflow list -->
    <div class="w-64 shrink-0 border-r border-gray-800 bg-gray-900/50 flex flex-col">
      <div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 class="text-sm font-semibold text-white">Workflows</h2>
        <AppButton variant="primary" size="xs" @click="showNewForm = !showNewForm">
          <svg v-if="!showNewForm" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ showNewForm ? 'Cancel' : 'New' }}
        </AppButton>
      </div>

      <!-- Create form -->
      <div v-if="showNewForm" class="border-b border-gray-800 px-4 py-3 space-y-2">
        <input
          v-model="newName"
          class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-shazam-500/50 focus:outline-none"
          placeholder="workflow-name"
          @keydown.enter="handleCreate"
        />
        <AppButton variant="primary" size="xs" :loading="isSaving" :disabled="!newName.trim()" class="w-full" @click="handleCreate">
          Create Workflow
        </AppButton>
      </div>

      <LoadingSpinner v-if="isLoading" label="Loading..." />

      <!-- Workflow list -->
      <div v-else class="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin">
        <button
          v-for="w in workflows"
          :key="w.name"
          class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all"
          :class="selectedName === w.name
            ? 'bg-shazam-500/10 text-shazam-400 border-l-2 border-shazam-500'
            : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 border-l-2 border-transparent'"
          @click="selectedName = w.name"
        >
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium truncate">{{ w.name }}</p>
            <div class="flex items-center gap-1 mt-0.5">
              <div v-for="(s, si) in w.stages" :key="si" class="h-1.5 w-1.5 rounded-full" :class="roleDot(s.role)" />
              <span class="text-[9px] text-gray-600 ml-1">{{ w.stages.length }} stages</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Main canvas area -->
    <div class="flex-1 flex flex-col">
      <ErrorBoundary :error="loadError" class="mx-4 mt-3" />

      <!-- Toolbar -->
      <div class="flex items-center justify-between border-b border-gray-800 bg-gray-900/30 px-4 py-2.5">
        <div class="flex items-center gap-3">
          <h1 class="text-sm font-semibold text-white">
            {{ selectedName ?? 'Select a workflow' }}
          </h1>
          <span v-if="selectedWorkflow" class="rounded-md bg-gray-800 px-2 py-0.5 text-[10px] tabular-nums text-gray-400">
            {{ selectedWorkflow.stages.length }} stages
          </span>
          <span v-if="isBuiltIn" class="rounded-md bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500">
            built-in
          </span>
          <span v-if="isEditing" class="rounded-md bg-shazam-500/20 px-2 py-0.5 text-[10px] font-medium text-shazam-400">
            editing
          </span>
        </div>

        <div v-if="selectedWorkflow" class="flex items-center gap-2">
          <template v-if="isEditing">
            <AppButton variant="ghost" size="xs" @click="addStage">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Stage
            </AppButton>
            <AppButton variant="secondary" size="xs" @click="cancelEdit">Cancel</AppButton>
            <AppButton variant="primary" size="xs" :loading="isSaving" @click="save">Save</AppButton>
          </template>
          <template v-else>
            <AppButton variant="primary" size="xs" @click="startEdit">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit
            </AppButton>
            <AppButton v-if="!isBuiltIn" variant="danger" size="xs" @click="confirmDelete">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </AppButton>
          </template>
        </div>
      </div>

      <!-- Delete confirmation bar -->
      <div
        v-if="showDeleteConfirm"
        class="flex items-center justify-between border-b border-red-500/30 bg-red-900/20 px-4 py-2"
      >
        <span class="text-xs text-red-400">
          Delete workflow "{{ selectedName }}"? This action cannot be undone.
        </span>
        <div class="flex items-center gap-2">
          <AppButton variant="ghost" size="xs" @click="cancelDelete">Cancel</AppButton>
          <AppButton variant="danger" size="xs" @click="handleDelete">Confirm Delete</AppButton>
        </div>
      </div>

      <!-- Vue Flow Canvas -->
      <div class="flex-1">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :default-viewport="{ x: 50, y: 50, zoom: 0.9 }"
          :min-zoom="0.3"
          :max-zoom="2"
          :nodes-draggable="isEditing"
          :nodes-connectable="false"
          class="workflow-canvas"
        >
          <Background :gap="20" :size="1" pattern-color="rgba(75, 85, 99, 0.15)" />
          <Controls :show-interactive="false" />

          <template #node-workflow-stage="{ data }">
            <WorkflowStageNode
              :data="data"
              @update="(field: string, value: string) => updateStage(data.index, field, value)"
              @remove="removeStage(data.index)"
            />
          </template>
        </VueFlow>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflows-page {
  animation: pageIn 0.3s ease-out;
}

@keyframes pageIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.workflow-canvas {
  background: #0a0a0f;
}

:deep(.vue-flow__controls) {
  background: rgba(17, 24, 39, 0.8);
  border: 1px solid rgba(75, 85, 99, 0.3);
  border-radius: 0.75rem;
}

:deep(.vue-flow__controls-button) {
  background: transparent;
  border: none;
  color: #9ca3af;
}

:deep(.vue-flow__controls-button:hover) {
  background: rgba(75, 85, 99, 0.3);
  color: white;
}

:deep(.vue-flow__edge-path) {
  stroke-width: 2;
}
</style>
