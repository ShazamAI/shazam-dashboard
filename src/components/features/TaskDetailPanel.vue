<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import AppButton from '@/components/common/Button.vue';
import PipelineSteps from '@/components/features/PipelineSteps.vue';
import TaskActionButtons from '@/components/features/TaskActionButtons.vue';
import DiffViewer from '@/components/features/DiffViewer.vue';
import { updateTask } from '@/api/taskService';
import { sendMessageToAgent } from '@/api/agentService';
import { fetchAgents } from '@/api/companyService';
import { useToast } from '@/composables/useToast';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { normalizeError } from '@/api/utils';
import { formatRelativeDate, formatResult } from '@/utils/formatters';
import { renderMarkdown } from '@/utils/markdown';
import type { Task, AgentWorker } from '@/types';
import type { DiffLine, AgentFileDiff } from '@/composables/useAgentOutput';

interface Props {
  task: Task;
  tasks?: Task[];
  actionLoading: Record<string, string>;
}

const props = defineProps<Props>();
const toast = useToast();

const hasPipeline = computed(() =>
  Array.isArray(props.task.pipeline) && props.task.pipeline.length > 1
);

const emit = defineEmits<{
  close: [];
  navigateAgent: [name: string];
  action: [taskId: string, action: string];
  updated: [task: Task];
}>();

// ─── Edit Mode ──────────────────────────────
const isEditing = ref(false);
const editTitle = ref('');
const editDescription = ref('');
const editSaving = ref(false);

watch(() => props.task, (t) => {
  editTitle.value = t.title;
  editDescription.value = t.description ?? '';
  isEditing.value = false;
}, { immediate: true });

function startEditing() {
  editTitle.value = props.task.title;
  editDescription.value = props.task.description ?? '';
  isEditing.value = true;
}

function cancelEditing() {
  isEditing.value = false;
}

async function saveEdits() {
  editSaving.value = true;
  try {
    const updated = await updateTask(props.task.id, {
      title: editTitle.value,
      description: editDescription.value,
    });
    emit('updated', updated);
    isEditing.value = false;
  } catch (e) {
    console.error('Failed to update task:', e);
    toast.error(normalizeError(e, 'Failed to save task'));
  } finally {
    editSaving.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showDelegateMenu.value) {
      showDelegateMenu.value = false;
    } else {
      emit('close');
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', closeDelegateMenu);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', closeDelegateMenu);
});

function isBusy(action: string): boolean {
  return props.actionLoading[props.task.id] === action;
}
function hasAnyBusy(): boolean {
  return !!props.actionLoading[props.task.id];
}

// ─── Diff Parsing from Result ────────────────
function parseGitDiff(result: string): AgentFileDiff[] {
  const files: AgentFileDiff[] = [];
  // Match git diff blocks: diff --git a/path b/path
  const diffBlocks = result.split(/^diff --git /m).filter(Boolean);

  for (const block of diffBlocks) {
    const pathMatch = block.match(/a\/(.+?)\s+b\//);
    if (!pathMatch) continue;

    const filePath = pathMatch[1] ?? '';
    const lines = block.split('\n');
    const diffs: DiffLine[] = [];
    let inHunk = false;
    let lineNum = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        inHunk = true;
        const numMatch = line.match(/\+(\d+)/);
        lineNum = numMatch?.[1] ? parseInt(numMatch[1], 10) : 0;
        continue;
      }
      if (!inHunk) continue;

      if (line.startsWith('+')) {
        diffs.push({ type: 'add', text: line.slice(1), lineNumber: lineNum++ });
      } else if (line.startsWith('-')) {
        diffs.push({ type: 'remove', text: line.slice(1) });
      } else if (line.length > 0 && !line.startsWith('\\')) {
        diffs.push({ type: 'context', text: line.startsWith(' ') ? line.slice(1) : line, lineNumber: lineNum++ });
      }
    }

    if (diffs.length > 0) {
      files.push({ path: filePath, diffs });
    }
  }

  return files;
}

const resultDiffs = computed<AgentFileDiff[]>(() => {
  if (!props.task.result) return [];
  const result = props.task.result;
  if (result.includes('diff --git')) {
    return parseGitDiff(result);
  }
  return [];
});

const showResultDiffs = ref(false);

// ─── Formatted Output & Delegation ──────────
const showFormattedOutput = ref(false);
const showDelegateMenu = ref(false);
const delegateAgents = ref<AgentWorker[]>([]);
const isDelegating = ref(false);
const { activeCompany } = useActiveCompany();

const formattedResult = computed(() => {
  if (!props.task.result) return '';
  return renderMarkdown(
    typeof props.task.result === 'string'
      ? props.task.result
      : JSON.stringify(props.task.result, null, 2)
  );
});

async function loadDelegateAgents() {
  if (!activeCompany.value?.name) return;
  try {
    delegateAgents.value = await fetchAgents(activeCompany.value.name);
  } catch {
    /* best-effort */
  }
}

async function delegateToAgent(agentName: string) {
  if (!props.task.result) return;
  isDelegating.value = true;
  try {
    const context = `Task "${props.task.title}" output:\n\n${props.task.result}`;
    await sendMessageToAgent(agentName, context, activeCompany.value?.name);
    toast.success(`Output delegated to ${agentName}`);
    showDelegateMenu.value = false;
  } catch (err) {
    toast.error(normalizeError(err, 'Failed to delegate'));
  } finally {
    isDelegating.value = false;
  }
}

function closeDelegateMenu(e: MouseEvent) {
  if (showDelegateMenu.value) {
    const target = e.target as HTMLElement;
    if (!target.closest('.delegate-menu-container')) {
      showDelegateMenu.value = false;
    }
  }
}

// ─── Dependency Chain ────────────────────────
interface ChainNode {
  id: string;
  title: string;
  status: string;
  isCurrent: boolean;
}

const dependencyChain = computed<ChainNode[]>(() => {
  if (!props.tasks || props.tasks.length === 0) return [];
  const taskMap = new Map(props.tasks.map(t => [t.id, t]));

  // Walk up to find the root ancestor
  const ancestors: Task[] = [];
  let current: Task | undefined = props.task;
  while (current?.depends_on) {
    const parent = taskMap.get(current.depends_on);
    if (!parent || ancestors.some(a => a.id === parent.id)) break; // prevent cycles
    ancestors.unshift(parent);
    current = parent;
  }

  // Walk down to find direct dependents (BFS, one pass)
  const descendants: Task[] = [];
  const queue = [props.task.id];
  const visited = new Set([props.task.id, ...ancestors.map(a => a.id)]);

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const t of props.tasks) {
      if (t.depends_on === parentId && !visited.has(t.id)) {
        descendants.push(t);
        visited.add(t.id);
        queue.push(t.id);
      }
    }
  }

  if (ancestors.length === 0 && descendants.length === 0) return [];

  const chain: ChainNode[] = [
    ...ancestors.map(t => ({ id: t.id, title: t.title, status: t.status, isCurrent: false })),
    { id: props.task.id, title: props.task.title, status: props.task.status, isCurrent: true },
    ...descendants.map(t => ({ id: t.id, title: t.title, status: t.status, isCurrent: false })),
  ];

  return chain;
});

function chainStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'bg-emerald-400';
    case 'in_progress': return 'bg-blue-400';
    case 'failed': return 'bg-red-400';
    case 'awaiting_approval': return 'bg-yellow-400';
    case 'paused': return 'bg-gray-400';
    default: return 'bg-gray-500';
  }
}

</script>

<template>
  <div class="detail-panel card w-full shrink-0 overflow-hidden lg:w-[420px]">
    <!-- Header -->
    <div class="flex items-start justify-between border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
      <div class="min-w-0 flex-1">
        <div class="mb-1.5 flex items-center gap-2">
          <StatusBadge :status="task.status" />
          <span class="font-mono text-[10px] text-gray-600">{{ task.id }}</span>
        </div>
        <input
          v-if="isEditing"
          v-model="editTitle"
          class="section-title w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 leading-snug text-white focus:border-shazam-500 focus:outline-none"
        />
        <h2 v-else class="section-title leading-snug">{{ task.title }}</h2>
      </div>
      <button
        class="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
        aria-label="Close detail panel"
        @click="emit('close')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Pipeline Steps -->
    <div v-if="hasPipeline" class="border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
      <PipelineSteps
        :stages="task.pipeline!"
        :current-stage="task.current_stage ?? 0"
        :workflow-name="task.workflow"
      />
    </div>

    <!-- Body -->
    <div class="max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
      <!-- Metadata grid -->
      <div class="grid grid-cols-2 gap-3 border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
        <div>
          <p class="data-label text-[10px] sm:text-xs">Assigned To</p>
          <p class="mt-1 text-xs text-gray-300">
            <button v-if="task.assigned_to" class="entity-link" @click="emit('navigateAgent', task.assigned_to)">{{ task.assigned_to }}</button>
            <span v-else class="text-gray-600">Unassigned</span>
          </p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Created By</p>
          <p class="mt-1 text-xs text-gray-300">{{ task.created_by ?? '—' }}</p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Company</p>
          <p class="mt-1 text-xs text-gray-300">{{ task.company ?? '—' }}</p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Parent Task</p>
          <p class="mt-1 font-mono text-xs text-gray-300">{{ task.parent_task_id ?? '—' }}</p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Depends On</p>
          <p class="mt-1 font-mono text-xs text-gray-300">{{ task.depends_on ?? '—' }}</p>
        </div>
        <div>
          <p class="data-label text-[10px] sm:text-xs">Created</p>
          <p class="mt-1 text-xs tabular-nums text-gray-300">{{ formatRelativeDate(task.created_at) }}</p>
        </div>
      </div>

      <!-- Dependency Chain -->
      <div v-if="dependencyChain.length > 0" class="border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
        <p class="micro-label mb-2">Dependency Chain</p>
        <div class="flex flex-col gap-1">
          <div
            v-for="(node, idx) in dependencyChain"
            :key="node.id"
            class="flex items-center gap-2"
          >
            <!-- Connector line -->
            <div class="flex w-4 flex-col items-center">
              <div v-if="idx > 0" class="h-1.5 w-px bg-gray-700" />
              <div class="h-2.5 w-2.5 shrink-0 rounded-full" :class="[chainStatusColor(node.status), node.isCurrent ? 'ring-2 ring-shazam-500/50' : '']" />
              <div v-if="idx < dependencyChain.length - 1" class="h-1.5 w-px bg-gray-700" />
            </div>
            <span
              class="truncate text-xs"
              :class="node.isCurrent ? 'font-medium text-white' : 'text-gray-400'"
            >
              {{ node.title }}
            </span>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="task.description || isEditing" class="border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
        <p class="micro-label mb-2">Description</p>
        <textarea
          v-if="isEditing"
          v-model="editDescription"
          rows="4"
          class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs leading-relaxed text-gray-300 focus:border-shazam-500 focus:outline-none"
        />
        <p v-else class="whitespace-pre-wrap text-xs leading-relaxed text-gray-300">{{ task.description }}</p>
      </div>

      <!-- Result -->
      <div v-if="task.result !== null && task.result !== undefined" class="border-b border-gray-800 px-3 py-3 sm:px-5 sm:py-4">
        <div class="flex items-center justify-between mb-2">
          <p class="micro-label">Result</p>
          <button
            v-if="resultDiffs.length > 0"
            class="rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors"
            :class="showResultDiffs ? 'bg-shazam-500/20 text-shazam-400' : 'bg-gray-800 text-gray-400 hover:text-gray-300'"
            @click="showResultDiffs = !showResultDiffs"
          >
            <svg class="mr-0.5 inline-block h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {{ showResultDiffs ? 'Raw' : 'Diff View' }}
            <span class="ml-1 text-[9px] text-gray-500">({{ resultDiffs.length }} files)</span>
          </button>
        </div>
        <div v-if="showResultDiffs && resultDiffs.length > 0" class="max-h-96 overflow-y-auto scrollbar-thin">
          <DiffViewer :diffs="resultDiffs" />
        </div>
        <div v-else-if="showFormattedOutput" class="max-h-96 overflow-y-auto rounded-lg border border-gray-800/50 bg-gray-900/50 p-4 scrollbar-thin">
          <div v-html="formattedResult" class="prose prose-invert prose-sm max-w-none" />
        </div>
        <div v-else class="max-h-80 overflow-y-auto rounded-lg border border-gray-800/50 bg-gray-950 p-3 scrollbar-thin">
          <pre class="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gray-300">{{ formatResult(task.result) }}</pre>
        </div>

        <!-- Output action buttons -->
        <div class="flex items-center gap-2 mt-2">
          <button
            class="rounded-lg border border-gray-700 px-3 py-1.5 text-[10px] font-medium transition-all"
            :class="showFormattedOutput ? 'bg-shazam-500/20 text-shazam-400 border-shazam-500/30' : 'text-gray-400 hover:bg-gray-800'"
            @click="showFormattedOutput = !showFormattedOutput"
          >
            {{ showFormattedOutput ? 'Raw' : 'Formatted' }}
          </button>

          <div class="relative delegate-menu-container">
            <button
              class="rounded-lg border border-gray-700 px-3 py-1.5 text-[10px] font-medium text-gray-400 hover:bg-gray-800 transition-all"
              @click.stop="showDelegateMenu = !showDelegateMenu; if (showDelegateMenu) loadDelegateAgents()"
            >
              Delegate to Agent &#9662;
            </button>

            <div
              v-if="showDelegateMenu"
              class="absolute left-0 bottom-full mb-1 z-50 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-xl py-1 max-h-60 overflow-y-auto scrollbar-thin"
            >
              <p v-if="delegateAgents.length === 0" class="px-3 py-2 text-[10px] text-gray-500">
                No agents available
              </p>
              <button
                v-for="agent in delegateAgents"
                :key="agent.name"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-800 transition-colors"
                :disabled="isDelegating"
                @click="delegateToAgent(agent.name)"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span class="truncate">{{ agent.name }}</span>
                <span class="text-[9px] text-gray-600 ml-auto">{{ agent.role }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions footer -->
    <div class="border-t border-gray-800 px-3 py-2.5 sm:px-5 sm:py-3">
      <div class="flex flex-wrap gap-2">
        <TaskActionButtons
          :task="task"
          :action-loading="actionLoading"
          size="sm"
          @action="(taskId: string, action: string) => emit('action', taskId, action)"
        />
        <!-- Edit / Save / Cancel -->
        <template v-if="isEditing">
          <AppButton variant="primary" size="sm" :loading="editSaving" :disabled="editSaving" @click="saveEdits">
            Save
          </AppButton>
          <AppButton variant="ghost" size="sm" :disabled="editSaving" @click="cancelEditing">
            Cancel
          </AppButton>
        </template>
        <AppButton v-else variant="ghost" size="sm" @click="startEditing">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit
        </AppButton>
        <div class="flex-1" />
        <AppButton variant="ghost" size="sm" :disabled="hasAnyBusy()" :loading="isBusy('delete')" @click="emit('action', task.id, 'delete')">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-panel {
  animation: panelSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes panelSlideIn {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Markdown rendered output */
:deep(.md-content) { @apply text-sm text-gray-300 leading-relaxed; }
:deep(.md-h2) { @apply text-base font-bold text-white mt-4 mb-2; }
:deep(.md-h3) { @apply text-sm font-semibold text-white mt-3 mb-1.5; }
:deep(.md-h4) { @apply text-xs font-semibold text-gray-200 mt-2 mb-1; }
:deep(.md-p) { @apply mb-2; }
:deep(.md-li) { @apply ml-4 list-disc; }
:deep(.md-li-num) { @apply ml-4 list-decimal; }
:deep(.code-block) { @apply rounded-lg bg-gray-950 border border-gray-800 p-3 my-2 text-xs font-mono text-gray-300 overflow-x-auto; }
:deep(.inline-code) { @apply rounded bg-gray-800 px-1.5 py-0.5 text-xs font-mono text-shazam-400; }
:deep(strong) { @apply font-semibold text-white; }
:deep(em) { @apply italic text-gray-400; }
</style>
