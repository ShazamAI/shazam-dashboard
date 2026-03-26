<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchPlans, fetchPlan, createPlan, updatePlan, approvePlan, refinePlan, deletePlan } from '@/api/planService';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { useToast } from '@/composables/useToast';
import AppButton from '@/components/common/Button.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import type { Plan, PlanTask } from '@/types';

const toast = useToast();
const { activeCompany } = useActiveCompany();

const plans = ref<Plan[]>([]);
const isLoading = ref(true);
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

const isDraft = computed(() => selectedPlan.value?.status === 'draft');

// Group tasks by phase
const tasksByPhase = computed(() => {
  const tasks = isEditing.value ? editTasks.value : (selectedPlan.value?.tasks ?? []);
  const grouped = new Map<string, PlanTask[]>();
  for (const task of tasks) {
    const phase = task.phase ?? 'Ungrouped';
    if (!grouped.has(phase)) grouped.set(phase, []);
    grouped.get(phase)!.push(task);
  }
  return grouped;
});

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'draft': return 'bg-gray-700 text-gray-300';
    case 'active': return 'bg-green-500/20 text-green-400';
    case 'completed': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-gray-700 text-gray-400';
  }
}

// Load all plans
async function load() {
  isLoading.value = true;
  try {
    plans.value = await fetchPlans();
    if (!selectedPlanId.value && plans.value.length > 0) {
      await selectPlan(plans.value[0]!.id);
    }
  } catch {
    toast.error('Failed to load plans');
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
    selectedPlan.value = plan;
  } catch {
    // Fallback to the summary from the list
    selectedPlan.value = plans.value.find(p => p.id === id) ?? null;
  }
}

// Create plan
async function handleCreate() {
  const desc = createDescription.value.trim();
  if (!desc || !activeCompany.value) return;
  isCreating.value = true;
  try {
    const result = await createPlan(desc, activeCompany.value.name);
    toast.success(`Plan created (task: ${result.task_id})`);
    showCreateForm.value = false;
    createDescription.value = '';
    await load();
    if (result.plan_id) {
      await selectPlan(result.plan_id);
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create plan');
  }
  isCreating.value = false;
}

// Start editing
function startEdit() {
  if (!selectedPlan.value) return;
  editTitle.value = selectedPlan.value.title;
  editSummary.value = selectedPlan.value.summary ?? '';
  editTasks.value = JSON.parse(JSON.stringify(selectedPlan.value.tasks));
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
    // Update in list
    const idx = plans.value.findIndex(p => p.id === selectedPlan.value!.id);
    if (idx >= 0) plans.value[idx] = updated;
    isEditing.value = false;
    toast.success('Plan saved');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to save plan');
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
    toast.error(err instanceof Error ? err.message : 'Failed to approve plan');
  }
  isSaving.value = false;
}

// Refine plan
async function handleRefine() {
  const fb = refineFeedback.value.trim();
  if (!selectedPlan.value || !activeCompany.value || !fb) return;
  isRefining.value = true;
  try {
    const result = await refinePlan(selectedPlan.value.id, activeCompany.value.name, fb);
    toast.success(`Refining plan (task: ${result.task_id})`);
    showRefineForm.value = false;
    refineFeedback.value = '';
    // Reload after a short delay to get updated plan
    setTimeout(() => {
      if (selectedPlanId.value) selectPlan(selectedPlanId.value);
    }, 2000);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to refine plan');
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
    toast.error(err instanceof Error ? err.message : 'Failed to delete plan');
  }
  isSaving.value = false;
}

// Update a task field in edit mode
function updateTaskField(phaseKey: string, taskIdx: number, field: keyof PlanTask, value: string) {
  // Find the global index
  let globalIdx = 0;
  for (const [phase, tasks] of tasksByPhase.value) {
    if (phase === phaseKey) {
      globalIdx += taskIdx;
      break;
    }
    globalIdx += tasks.length;
  }
  if (editTasks.value[globalIdx]) {
    (editTasks.value[globalIdx] as Record<string, unknown>)[field] = value;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

onMounted(load);
</script>

<template>
  <div class="plans-page flex h-[calc(100vh-64px)]">
    <!-- Left sidebar: plan list -->
    <div class="w-72 shrink-0 border-r border-gray-800 bg-gray-900/50 flex flex-col">
      <div class="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 class="text-sm font-semibold text-white">Plans</h2>
        <AppButton variant="primary" size="xs" @click="showCreateForm = !showCreateForm">
          <svg v-if="!showCreateForm" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ showCreateForm ? 'Cancel' : 'New' }}
        </AppButton>
      </div>

      <!-- Create form -->
      <div v-if="showCreateForm" class="border-b border-gray-800 px-4 py-3 space-y-2">
        <textarea
          v-model="createDescription"
          class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-shazam-500/50 focus:outline-none resize-none"
          placeholder="Describe what you want to build..."
          rows="4"
        />
        <AppButton
          variant="primary"
          size="xs"
          :loading="isCreating"
          :disabled="!createDescription.trim()"
          class="w-full"
          @click="handleCreate"
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
          @click="selectPlan(p.id)"
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
      <template v-else>
        <!-- Toolbar -->
        <div class="flex items-center justify-between border-b border-gray-800 bg-gray-900/30 px-6 py-3">
          <div class="flex items-center gap-3 min-w-0">
            <h1 v-if="!isEditing" class="text-sm font-semibold text-white truncate">
              {{ selectedPlan.title }}
            </h1>
            <input
              v-else
              v-model="editTitle"
              class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1 text-sm font-semibold text-white focus:border-shazam-500/50 focus:outline-none"
            />
            <span
              class="shrink-0 inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium"
              :class="statusBadgeClass(selectedPlan.status)"
            >
              {{ selectedPlan.status }}
            </span>
            <span v-if="isEditing" class="shrink-0 rounded-md bg-shazam-500/20 px-2 py-0.5 text-[10px] font-medium text-shazam-400">
              editing
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <template v-if="isEditing">
              <AppButton variant="secondary" size="xs" @click="cancelEdit">Cancel</AppButton>
              <AppButton variant="primary" size="xs" :loading="isSaving" @click="saveDraft">Save Draft</AppButton>
            </template>
            <template v-else>
              <AppButton v-if="isDraft" variant="primary" size="xs" @click="startEdit">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit
              </AppButton>
              <AppButton v-if="isDraft" variant="secondary" size="xs" @click="showRefineForm = !showRefineForm">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                Ask AI to Refine
              </AppButton>
              <AppButton v-if="isDraft" variant="primary" size="xs" :loading="isSaving" @click="handleApprove">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Approve Plan
              </AppButton>
              <AppButton variant="danger" size="xs" @click="showDeleteConfirm = true">
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
            v-model="refineFeedback"
            class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-shazam-500/50 focus:outline-none resize-none"
            placeholder="e.g. Add more test coverage tasks, split the frontend work into smaller steps..."
            rows="3"
          />
          <div class="flex gap-2">
            <AppButton variant="secondary" size="xs" @click="showRefineForm = false">Cancel</AppButton>
            <AppButton variant="primary" size="xs" :loading="isRefining" :disabled="!refineFeedback.trim()" @click="handleRefine">
              Send Feedback
            </AppButton>
          </div>
        </div>

        <!-- Delete confirmation -->
        <div v-if="showDeleteConfirm" class="border-b border-red-900/30 bg-red-950/20 px-6 py-3 flex items-center gap-3">
          <p class="text-xs text-red-400">Are you sure you want to delete this plan? This cannot be undone.</p>
          <div class="flex gap-2 shrink-0">
            <AppButton variant="secondary" size="xs" @click="showDeleteConfirm = false">Cancel</AppButton>
            <AppButton variant="danger" size="xs" :loading="isSaving" @click="handleDelete">Delete</AppButton>
          </div>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">
          <!-- Summary -->
          <div v-if="selectedPlan.summary || isEditing">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Summary</h3>
            <textarea
              v-if="isEditing"
              v-model="editSummary"
              class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:border-shazam-500/50 focus:outline-none resize-none"
              rows="3"
            />
            <p v-else class="text-sm text-gray-300 leading-relaxed">{{ selectedPlan.summary }}</p>
          </div>

          <!-- Meta info -->
          <div class="flex items-center gap-4 text-[10px] text-gray-600">
            <span>Created {{ formatDate(selectedPlan.created_at) }}</span>
            <span>{{ selectedPlan.tasks?.length ?? 0 }} tasks</span>
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
                      @input="updateTaskField(phase, ti, 'title', ($event.target as HTMLInputElement).value)"
                    />
                    <div class="flex gap-2 mb-1.5">
                      <input
                        :value="task.assigned_to"
                        class="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-400 focus:border-shazam-500/50 focus:outline-none"
                        placeholder="Assigned to"
                        @input="updateTaskField(phase, ti, 'assigned_to', ($event.target as HTMLInputElement).value)"
                      />
                      <input
                        :value="task.depends_on ?? ''"
                        class="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-400 focus:border-shazam-500/50 focus:outline-none"
                        placeholder="Depends on"
                        @input="updateTaskField(phase, ti, 'depends_on', ($event.target as HTMLInputElement).value)"
                      />
                    </div>
                    <textarea
                      :value="task.description"
                      class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-400 focus:border-shazam-500/50 focus:outline-none resize-none"
                      rows="2"
                      placeholder="Description"
                      @input="updateTaskField(phase, ti, 'description', ($event.target as HTMLTextAreaElement).value)"
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
          <div v-if="selectedPlan.architecture" class="space-y-4">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Architecture</h3>

            <!-- Files created -->
            <div v-if="selectedPlan.architecture.files_created?.length">
              <h4 class="text-[10px] font-medium text-gray-400 mb-1.5">Files Created</h4>
              <div class="space-y-1">
                <div
                  v-for="file in selectedPlan.architecture.files_created"
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
            <div v-if="selectedPlan.architecture.files_modified?.length">
              <h4 class="text-[10px] font-medium text-gray-400 mb-1.5">Files Modified</h4>
              <div class="space-y-1">
                <div
                  v-for="file in selectedPlan.architecture.files_modified"
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
            <div v-if="selectedPlan.architecture.decisions?.length">
              <h4 class="text-[10px] font-medium text-gray-400 mb-1.5">Decisions</h4>
              <div class="space-y-1.5">
                <div
                  v-for="(d, di) in selectedPlan.architecture.decisions"
                  :key="di"
                  class="rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2"
                >
                  <p class="text-[10px] font-medium text-white">{{ d.decision }}</p>
                  <p class="text-[10px] text-gray-500 mt-0.5">{{ d.reason }}</p>
                </div>
              </div>
            </div>

            <!-- Dependencies -->
            <div v-if="selectedPlan.architecture.dependencies?.length">
              <h4 class="text-[10px] font-medium text-gray-400 mb-1.5">Dependencies</h4>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="dep in selectedPlan.architecture.dependencies"
                  :key="dep"
                  class="inline-flex rounded-md bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400 font-mono"
                >
                  {{ dep }}
                </span>
              </div>
            </div>
          </div>

          <!-- Risks section -->
          <div v-if="selectedPlan.risks?.length">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Risks</h3>
            <div class="space-y-2">
              <div
                v-for="(r, ri) in selectedPlan.risks"
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
