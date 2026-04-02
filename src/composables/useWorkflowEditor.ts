import { ref, computed, watch } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { Node, Edge } from '@vue-flow/core';
import { fetchWorkflows, saveWorkflow, createWorkflow, deleteWorkflow } from '@/api/taskService';
import { useToast } from '@/composables/useToast';
import { normalizeError } from '@/api/utils';
import type { Workflow, WorkflowStage } from '@/types';

export function useWorkflowEditor() {
  const toast = useToast();
  const { fitView, onNodesInitialized } = useVueFlow();

  // Auto-fit when nodes finish rendering
  onNodesInitialized(() => {
    setTimeout(() => fitView({ padding: 0.4, duration: 300 }), 50);
  });

  const workflows = ref<Workflow[]>([]);
  const isLoading = ref(true);
  const loadError = ref<string | null>(null);
  const selectedName = ref<string | null>(null);
  const isEditing = ref(false);
  const isSaving = ref(false);
  const showNewForm = ref(false);
  const showDeleteConfirm = ref(false);
  const newName = ref('');

  // Canvas state
  const nodes = ref([]) as import('vue').Ref<Node[]>;
  const edges = ref([]) as import('vue').Ref<Edge[]>;

  // Editable stages (working copy)
  const editStages = ref<WorkflowStage[]>([]);

  const selectedWorkflow = computed(() =>
    workflows.value.find(w => w.name === selectedName.value) ?? null
  );

  const isBuiltIn = computed(() => {
    const builtins = ['default', 'feature', 'hotfix', 'review-only', 'docs'];
    return selectedName.value ? builtins.includes(selectedName.value) : false;
  });

  // --- Build canvas from stages ---

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

    setTimeout(() => fitView({ padding: 0.4, duration: 300 }), 200);
  }

  // --- Load workflows ---

  async function load() {
    isLoading.value = true;
    loadError.value = null;
    try {
      workflows.value = await fetchWorkflows();
      if (!selectedName.value && workflows.value.length > 0) {
        selectedName.value = workflows.value[0]!.name;
      }
    } catch (err) {
      const msg = normalizeError(err, 'Failed to load workflows');
      console.warn('[WorkflowEditor] Failed to load workflows:', msg);
      loadError.value = msg;
      toast.error(msg);
    }
    isLoading.value = false;
  }

  // --- Watch selected workflow ---

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

  // --- Edit mode ---

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
      const idx = workflows.value.findIndex(w => w.name === selectedName.value);
      if (idx >= 0) {
        workflows.value[idx] = { name: selectedName.value, stages: JSON.parse(JSON.stringify(editStages.value)) };
      }
      isEditing.value = false;
      buildCanvas(editStages.value);
      toast.success('Workflow saved');
    } catch (err) {
      toast.error(normalizeError(err, 'Failed to save'));
    }
    isSaving.value = false;
  }

  // --- Create new workflow ---

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
      toast.error(normalizeError(err, 'Failed to create workflow'));
    }
    isSaving.value = false;
  }

  function confirmDelete() {
    if (!selectedName.value || isBuiltIn.value) return;
    showDeleteConfirm.value = true;
  }

  function cancelDelete() {
    showDeleteConfirm.value = false;
  }

  async function handleDelete() {
    if (!selectedName.value || isBuiltIn.value) return;
    showDeleteConfirm.value = false;
    try {
      await deleteWorkflow(selectedName.value);
      workflows.value = workflows.value.filter(w => w.name !== selectedName.value);
      selectedName.value = workflows.value[0]?.name ?? null;
      toast.success('Workflow deleted');
    } catch (err) {
      console.warn('[WorkflowEditor] Failed to delete workflow:', err);
      toast.error(normalizeError(err, 'Failed to delete workflow'));
    }
  }

  // --- Role colors for list ---

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

  return {
    // State
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

    // Actions
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
  };
}
