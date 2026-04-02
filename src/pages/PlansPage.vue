<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchPlans, fetchPlan, createPlan, updatePlan, approvePlan, refinePlan, deletePlan } from '@/api/planService';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useToast } from '@/composables/useToast';
import { normalizeError } from '@/api/utils';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import PlanList from '@/components/features/PlanList.vue';
import PlanDetail from '@/components/features/PlanDetail.vue';
import type { Plan, PlanTask } from '@/types';

const toast = useToast();
const { activeCompany } = useActiveCompany();

const plans = ref<Plan[]>([]);
const isLoading = ref(true);
const loadError = ref<string | null>(null);
const selectedPlanId = ref<string | null>(null);
const selectedPlan = ref<Plan | null>(null);
const isSaving = ref(false);

// Create modal
const showCreateForm = ref(false);
const createDescription = ref('');
const isCreating = ref(false);

// Refine modal
const showRefineForm = ref(false);
const refineFeedback = ref('');
const isRefining = ref(false);

// Delete confirmation
const showDeleteConfirm = ref(false);

// Editing state
const isEditing = ref(false);
const editTitle = ref('');
const editSummary = ref('');
const editTasks = ref<PlanTask[]>([]);

// Load all plans
async function load() {
  isLoading.value = true;
  loadError.value = null;
  try {
    plans.value = await fetchPlans();
    if (!selectedPlanId.value && plans.value.length > 0) {
      await selectPlan(plans.value[0]!.id);
    }
  } catch (err) {
    const msg = normalizeError(err, 'Failed to load plans');
    loadError.value = msg;
    toast.error(msg);
  }
  isLoading.value = false;
}

// Select and load a plan's full details
async function selectPlan(id: string) {
  selectedPlanId.value = id;
  isEditing.value = false;
  showRefineForm.value = false;
  showDeleteConfirm.value = false;
  try {
    const plan = await fetchPlan(id);
    // Only update if this plan is still the selected one (race condition guard)
    if (selectedPlanId.value === id) {
      selectedPlan.value = plan;
    }
  } catch {
    if (selectedPlanId.value === id) {
      selectedPlan.value = plans.value.find(p => p.id === id) ?? null;
    }
  }
}

// Create plan
async function handleCreate() {
  const desc = createDescription.value.trim();
  if (!desc || !activeCompany.value) return;
  isCreating.value = true;
  try {
    const result = await createPlan(desc, activeCompany.value.name);
    toast.success(`Plan "${result.plan_id}" created as draft`);
    showCreateForm.value = false;
    createDescription.value = '';
    await load();
    if (result.plan_id) {
      await selectPlan(result.plan_id);
    }
  } catch (err) {
    toast.error(normalizeError(err, 'Failed to create plan'));
  }
  isCreating.value = false;
}

// Start editing
function startEdit() {
  if (!selectedPlan.value) return;
  editTitle.value = selectedPlan.value.title;
  editSummary.value = selectedPlan.value.summary ?? '';
  editTasks.value = structuredClone(selectedPlan.value.tasks);
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
}

// Save draft
async function saveDraft() {
  if (!selectedPlan.value) return;
  isSaving.value = true;
  try {
    const updated = await updatePlan(selectedPlan.value.id, {
      title: editTitle.value,
      summary: editSummary.value,
      tasks: editTasks.value,
    });
    selectedPlan.value = updated;
    const idx = plans.value.findIndex(p => p.id === selectedPlan.value!.id);
    if (idx >= 0) plans.value[idx] = updated;
    isEditing.value = false;
    toast.success('Plan saved');
  } catch (err) {
    toast.error(normalizeError(err, 'Failed to save plan'));
  }
  isSaving.value = false;
}

// Approve plan
async function handleApprove() {
  if (!selectedPlan.value || !activeCompany.value) return;
  isSaving.value = true;
  try {
    const result = await approvePlan(selectedPlan.value.id, activeCompany.value.name);
    toast.success(`Plan approved — ${result.tasks_created} tasks created`);
    await load();
    if (selectedPlanId.value) await selectPlan(selectedPlanId.value);
  } catch (err) {
    toast.error(normalizeError(err, 'Failed to approve plan'));
  }
  isSaving.value = false;
}

// Refine plan (appends feedback, no task created)
async function handleRefine() {
  const fb = refineFeedback.value.trim();
  if (!selectedPlan.value || !fb) return;
  isRefining.value = true;
  try {
    await refinePlan(selectedPlan.value.id, activeCompany.value?.name ?? '', fb);
    toast.success('Plan refined');
    showRefineForm.value = false;
    refineFeedback.value = '';
    // Reload to see updated summary
    if (selectedPlanId.value) await selectPlan(selectedPlanId.value);
  } catch (err) {
    toast.error(normalizeError(err, 'Failed to refine plan'));
  }
  isRefining.value = false;
}

// Delete plan
async function handleDelete() {
  if (!selectedPlan.value) return;
  isSaving.value = true;
  try {
    await deletePlan(selectedPlan.value.id);
    plans.value = plans.value.filter(p => p.id !== selectedPlan.value!.id);
    selectedPlan.value = null;
    selectedPlanId.value = plans.value[0]?.id ?? null;
    if (selectedPlanId.value) await selectPlan(selectedPlanId.value);
    showDeleteConfirm.value = false;
    toast.success('Plan deleted');
  } catch (err) {
    toast.error(normalizeError(err, 'Failed to delete plan'));
  }
  isSaving.value = false;
}

// Update a task field in edit mode
function updateTaskField(phaseKey: string, taskIdx: number, _field: keyof PlanTask, value: string) {
  // Find the global index by counting tasks in phases before the target phase
  let globalIdx = 0;
  for (const task of editTasks.value) {
    const phase = task.phase ?? 'Ungrouped';
    if (phase === phaseKey) {
      if (taskIdx === 0) break;
      taskIdx--;
    }
    globalIdx++;
  }
  if (globalIdx >= 0 && globalIdx < editTasks.value.length) {
    (editTasks.value[globalIdx] as Record<string, unknown>)[_field] = value;
  }
}

onMounted(load);
</script>

<template>
  <div class="plans-page flex flex-col h-[calc(100vh-64px)]">
    <ErrorBoundary :error="loadError" class="mx-4 mt-3" />

    <div class="flex flex-1 overflow-hidden">
    <!-- Left sidebar: plan list -->
    <PlanList
      :plans="plans"
      :is-loading="isLoading"
      :selected-plan-id="selectedPlanId"
      :show-create-form="showCreateForm"
      :create-description="createDescription"
      :is-creating="isCreating"
      @update:show-create-form="showCreateForm = $event"
      @update:create-description="createDescription = $event"
      @select-plan="selectPlan"
      @create="handleCreate"
    />

    <!-- Main detail area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Empty state -->
      <div v-if="!selectedPlan" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p class="mt-2 text-sm text-gray-500">Select a plan or create a new one</p>
        </div>
      </div>

      <!-- Plan detail -->
      <PlanDetail
        v-else
        :plan="selectedPlan"
        :is-editing="isEditing"
        :is-saving="isSaving"
        :is-refining="isRefining"
        :edit-title="editTitle"
        :edit-summary="editSummary"
        :edit-tasks="editTasks"
        :show-refine-form="showRefineForm"
        :show-delete-confirm="showDeleteConfirm"
        :refine-feedback="refineFeedback"
        @update:edit-title="editTitle = $event"
        @update:edit-summary="editSummary = $event"
        @update:show-refine-form="showRefineForm = $event"
        @update:show-delete-confirm="showDeleteConfirm = $event"
        @update:refine-feedback="refineFeedback = $event"
        @start-edit="startEdit"
        @cancel-edit="cancelEdit"
        @save-draft="saveDraft"
        @approve="handleApprove"
        @refine="handleRefine"
        @delete="handleDelete"
        @update-task-field="updateTaskField"
      />
    </div>
    </div>
  </div>
</template>

<style scoped>
.plans-page {
  animation: pageIn 0.3s ease-out;
}

@keyframes pageIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
