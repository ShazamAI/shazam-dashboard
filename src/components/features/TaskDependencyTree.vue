<script setup lang="ts">
/**
 * TaskDependencyTree — shows parent -> current -> child task chain.
 * Fetches ancestry data from GET /api/tasks/:id/ancestry.
 */
import { ref, onMounted, watch } from 'vue';
import { get } from '@/api/http';

const props = defineProps<{
  taskId: string;
  parentTaskId: string | null;
}>();

const emit = defineEmits<{
  navigate: [taskId: string];
}>();

interface AncestryNode {
  id: string;
  title: string;
}

const ancestors = ref<AncestryNode[]>([]);
const children = ref<AncestryNode[]>([]);
const currentTitle = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);

async function loadAncestry() {
  isLoading.value = true;
  error.value = null;
  try {
    const result = await get<AncestryNode[]>(`/tasks/${props.taskId}/ancestry`);
    if (Array.isArray(result) && result.length > 0) {
      // The ancestry array typically returns from root to current.
      // The last item is the current task itself.
      const chain = [...result];
      const currentIdx = chain.findIndex((n) => n.id === props.taskId);

      if (currentIdx >= 0) {
        ancestors.value = chain.slice(0, currentIdx);
        currentTitle.value = chain[currentIdx]?.title ?? '';
        children.value = chain.slice(currentIdx + 1);
      } else {
        // If current task not in chain, treat everything as ancestors
        ancestors.value = chain;
        currentTitle.value = '';
      }
    } else {
      ancestors.value = [];
      children.value = [];
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load task ancestry';
    ancestors.value = [];
    children.value = [];
  } finally {
    isLoading.value = false;
  }
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

onMounted(loadAncestry);
watch(() => props.taskId, loadAncestry);
</script>

<template>
  <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
    <h3 class="text-sm font-medium text-white mb-4">Dependencies</h3>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-6">
      <div class="h-4 w-4 border-2 border-shazam-500/30 border-t-shazam-500 rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-4">
      <p class="text-xs text-red-400">{{ error }}</p>
    </div>

    <!-- Tree -->
    <div v-else class="flex flex-col items-center">
      <!-- No dependencies -->
      <div v-if="ancestors.length === 0 && children.length === 0 && !parentTaskId" class="text-center py-4">
        <p class="text-xs text-gray-600">No dependencies</p>
      </div>

      <template v-else>
        <!-- Ancestor nodes -->
        <div
          v-for="node in ancestors"
          :key="node.id"
          class="flex flex-col items-center w-full"
        >
          <button
            class="group flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800 transition-all w-full max-w-xs"
            @click="emit('navigate', node.id)"
          >
            <svg class="h-3 w-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <div class="flex-1 min-w-0 text-left">
              <p class="text-xs text-gray-400 group-hover:text-gray-200 truncate transition-colors">{{ node.title }}</p>
              <p class="text-[9px] text-gray-600 font-mono">{{ shortId(node.id) }}</p>
            </div>
          </button>
          <!-- Connecting line -->
          <div class="w-0.5 h-4 bg-gray-700" />
        </div>

        <!-- Parent (if no ancestry but parent_task_id exists) -->
        <template v-if="ancestors.length === 0 && parentTaskId">
          <button
            class="group flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800 transition-all w-full max-w-xs"
            @click="emit('navigate', parentTaskId!)"
          >
            <svg class="h-3 w-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <div class="flex-1 min-w-0 text-left">
              <p class="text-xs text-gray-400 group-hover:text-gray-200 truncate transition-colors">Parent Task</p>
              <p class="text-[9px] text-gray-600 font-mono">{{ shortId(parentTaskId!) }}</p>
            </div>
          </button>
          <div class="w-0.5 h-4 bg-gray-700" />
        </template>

        <!-- Current task (highlighted) -->
        <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-shazam-500/30 bg-shazam-500/5 w-full max-w-xs">
          <div class="h-2.5 w-2.5 rounded-full bg-shazam-500 shadow-sm shadow-shazam-500/30 shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs text-shazam-400 font-medium truncate">
              {{ currentTitle || 'Current Task' }}
            </p>
            <p class="text-[9px] text-gray-500 font-mono">{{ shortId(taskId) }}</p>
          </div>
        </div>

        <!-- Children -->
        <div
          v-for="node in children"
          :key="node.id"
          class="flex flex-col items-center w-full"
        >
          <div class="w-0.5 h-4 bg-gray-700" />
          <button
            class="group flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800 transition-all w-full max-w-xs"
            @click="emit('navigate', node.id)"
          >
            <svg class="h-3 w-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <div class="flex-1 min-w-0 text-left">
              <p class="text-xs text-gray-400 group-hover:text-gray-200 truncate transition-colors">{{ node.title }}</p>
              <p class="text-[9px] text-gray-600 font-mono">{{ shortId(node.id) }}</p>
            </div>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
