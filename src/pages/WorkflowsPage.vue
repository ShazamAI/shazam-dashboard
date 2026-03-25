<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import type { Node, Edge } from '@vue-flow/core';
import { fetchWorkflows, saveWorkflow, createWorkflow, deleteWorkflow } from '@/api/taskService';
import { useToast } from '@/composables/useToast';
import WorkflowStageNode from '@/components/canvas/WorkflowStageNode.vue';
import AppButton from '@/components/common/Button.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import type { Workflow, WorkflowStage } from '@/types';

const toast = useToast();
const { fitView, onNodesInitialized } = useVueFlow();

// Auto-fit when nodes finish rendering
onNodesInitialized(() => {
  setTimeout(() => fitView({ padding: 0.4, duration: 300 }), 50);
});

const workflows = ref<Workflow[]>([]);
const isLoading = ref(true);
const selectedName = ref<string | null>(null);
const isEditing = ref(false);
const isSaving = ref(false);
const showNewForm = ref(false);
const newName = ref('');

// Canvas state
const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);

// Editable stages (working copy)
const editStages = ref<WorkflowStage[]>([]);

const selectedWorkflow = computed(() =>
  workflows.value.find(w => w.name === selectedName.value) ?? null
);

const isBuiltIn = computed(() => {
  const builtins = ['default', 'feature', 'hotfix', 'review-only', 'docs'];
  return selectedName.value ? builtins.includes(selectedName.value) : false;
});

// ─── Load workflows ──────────────────────────────

async function load() {
  isLoading.value = true;
  try {
    workflows.value = await fetchWorkflows();
    if (!selectedName.value && workflows.value.length > 0) {
      selectedName.value = workflows.value[0]!.name;
    }
  } catch { /* ignore */ }
  isLoading.value = false;
}

// ─── Build canvas from stages ────────────────────

function buildCanvas(stages: WorkflowStage[]) {
  const spacing = 280;
  const totalWidth = stages.length * spacing;
  const startX = Math.max(50, (800 - totalWidth) / 2);

  nodes.value = stages.map((stage, i) => ({
    id: `stage-${i}`,
    type: 'workflow-stage',
    position: { x: startX + i * spacing, y: 80 },
    data: {
      ...stage,
      index: i,
      isFirst: i === 0,
      isLast: i === stages.length - 1,
      editing: isEditing.value,
    },
  }));

  edges.value = stages.slice(0, -1).map((_, i) => ({
    id: `edge-${i}`,
    source: `stage-${i}`,
    target: `stage-${i + 1}`,
    animated: true,
    style: { stroke: '#4b5563', strokeWidth: 2 },
    type: 'smoothstep',
  }));

  // Add on_reject edges (dashed, red)
  stages.forEach((stage, i) => {
    if (stage.on_reject) {
      const targetIdx = stages.findIndex(s => s.name === stage.on_reject);
      if (targetIdx >= 0 && targetIdx !== i) {
        edges.value.push({
          id: `reject-${i}`,
          source: `stage-${i}`,
          target: `stage-${targetIdx}`,
          animated: false,
          style: { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '5 5' },
          type: 'smoothstep',
          label: 'reject',
          labelStyle: { fill: '#ef4444', fontSize: 9 },
          labelBgStyle: { fill: '#111827' },
        });
      }
    }
  });

  // fitView is handled by onNodesInitialized
  setTimeout(() => fitView({ padding: 0.4, duration: 300 }), 200);
}

// ─── Watch selected workflow ─────────────────────

watch(selectedName, (name) => {
  isEditing.value = false;
  showNewForm.value = false;
  if (!name) {
    nodes.value = [];
    edges.value = [];
    return;
  }
  const wf = workflows.value.find(w => w.name === name);
  if (wf) {
    editStages.value = JSON.parse(JSON.stringify(wf.stages));
    buildCanvas(wf.stages);
  }
});

// ─── Edit mode ───────────────────────────────────

function startEdit() {
  const wf = selectedWorkflow.value;
  if (!wf) return;
  editStages.value = JSON.parse(JSON.stringify(wf.stages));
  isEditing.value = true;
  buildCanvas(editStages.value);
}

function cancelEdit() {
  isEditing.value = false;
  const wf = selectedWorkflow.value;
  if (wf) buildCanvas(wf.stages);
}

function updateStage(index: number, field: string, value: string) {
  if (editStages.value[index]) {
    (editStages.value[index] as Record<string, unknown>)[field] = value;
    buildCanvas(editStages.value);
  }
}

function removeStage(index: number) {
  editStages.value.splice(index, 1);
  buildCanvas(editStages.value);
}

function addStage() {
  editStages.value.push({
    name: `stage_${editStages.value.length + 1}`,
    role: 'dev',
    prompt_suffix: null,
    on_reject: null,
  });
  buildCanvas(editStages.value);
}

async function save() {
  if (!selectedName.value || editStages.value.length === 0) return;
  isSaving.value = true;
  try {
    await saveWorkflow({ name: selectedName.value, stages: editStages.value });
    // Update local cache
    const idx = workflows.value.findIndex(w => w.name === selectedName.value);
    if (idx >= 0) {
      workflows.value[idx] = { name: selectedName.value, stages: JSON.parse(JSON.stringify(editStages.value)) };
    }
    isEditing.value = false;
    buildCanvas(editStages.value);
    toast.success('Workflow saved');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to save');
  }
  isSaving.value = false;
}

// ─── Create new workflow ─────────────────────────

async function handleCreate() {
  const name = newName.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) return;
  isSaving.value = true;
  try {
    const newWf: Workflow = {
      name,
      stages: [
        { name: 'develop', role: 'dev', prompt_suffix: null, on_reject: null },
        { name: 'review', role: 'reviewer', prompt_suffix: null, on_reject: 'develop' },
        { name: 'commit', role: 'dev', prompt_suffix: null, on_reject: null },
      ],
    };
    await createWorkflow(newWf);
    workflows.value.push(newWf);
    selectedName.value = name;
    showNewForm.value = false;
    newName.value = '';
    toast.success(`Workflow "${name}" created`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create');
  }
  isSaving.value = false;
}

async function handleDelete() {
  if (!selectedName.value || isBuiltIn.value) return;
  try {
    await deleteWorkflow(selectedName.value);
    workflows.value = workflows.value.filter(w => w.name !== selectedName.value);
    selectedName.value = workflows.value[0]?.name ?? null;
    toast.success('Workflow deleted');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to delete');
  }
}

// ─── Role colors for list ────────────────────────

const roleColorMap: Record<string, string> = {
  dev: 'bg-blue-500', reviewer: 'bg-purple-500', qa: 'bg-amber-500',
};

function roleDot(role: string): string {
  const lower = role.toLowerCase();
  for (const [key, cls] of Object.entries(roleColorMap)) {
    if (lower.includes(key)) return cls;
  }
  return 'bg-gray-500';
}

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
            <AppButton v-if="!isBuiltIn" variant="danger" size="xs" @click="handleDelete">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </AppButton>
          </template>
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
