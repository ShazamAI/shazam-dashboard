<script setup lang="ts">
import { ref } from 'vue';
import { useProjects } from '@/composables/useProjects';
import ErrorBoundary from '@/components/common/ErrorBoundary.vue';
import ProjectCard from '@/components/features/ProjectCard.vue';

const { projects, isLoading, error, actionLoading, syncStatus, load, add, start, stop, remove, select, syncProjectConfig } = useProjects();

const showAddForm = ref(false);
const newProjectPath = ref('');
const addingProject = ref(false);
const confirmingRemove = ref<string | null>(null);

async function handleAdd() {
  const path = newProjectPath.value.trim();
  if (!path) return;
  addingProject.value = true;
  try {
    await add(path);
    newProjectPath.value = '';
    showAddForm.value = false;
  } finally {
    addingProject.value = false;
  }
}

function handleRemove(name: string) {
  confirmingRemove.value = name;
}

function confirmRemove() {
  if (confirmingRemove.value) {
    remove(confirmingRemove.value);
    confirmingRemove.value = null;
  }
}

function cancelRemove() {
  confirmingRemove.value = null;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Projects</h1>
        <p class="text-sm text-gray-400 mt-1">Manage your Shazam projects. Start, stop, and monitor agent teams.</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isLoading"
          aria-label="Refresh projects"
          @click="load"
        >
          <svg class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          class="flex items-center gap-2 rounded-xl bg-shazam-500/20 px-4 py-2.5 text-sm font-medium text-shazam-400 transition-all hover:bg-shazam-500/30"
          aria-label="Add project"
          @click="showAddForm = !showAddForm"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Project
        </button>
      </div>
    </div>

    <!-- Error -->
    <ErrorBoundary :error="error" />

    <!-- Add Form -->
    <Transition name="fade-up">
      <div v-if="showAddForm" class="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
        <h3 class="text-sm font-medium text-gray-300 mb-3">Add a project directory</h3>
        <div class="flex gap-3">
          <input
            v-model="newProjectPath"
            type="text"
            placeholder="/Users/you/projects/my-project"
            class="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
            @keyup.enter="handleAdd"
          />
          <button
            class="rounded-lg bg-shazam-500 px-5 py-2.5 text-sm font-medium text-gray-950 transition-all hover:bg-shazam-400 disabled:opacity-50"
            :disabled="addingProject || !newProjectPath.trim()"
            @click="handleAdd"
          >
            {{ addingProject ? 'Adding...' : 'Add' }}
          </button>
          <button
            class="rounded-lg border border-gray-600 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-700"
            @click="showAddForm = false"
          >
            Cancel
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          The directory must contain a <code class="text-gray-400">shazam.yaml</code> or
          <code class="text-gray-400">.shazam/shazam.yaml</code> file.
        </p>
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="isLoading && projects.length === 0" class="text-center py-12 text-gray-500">
      Loading projects...
    </div>

    <!-- Empty -->
    <div v-else-if="projects.length === 0" class="text-center py-16">
      <div class="text-4xl mb-4">&#x26A1;</div>
      <h3 class="text-lg font-medium text-gray-300 mb-2">No projects registered</h3>
      <p class="text-sm text-gray-500 mb-6">
        Add a project directory or run <code class="text-gray-400">shazam</code> in a project to register it automatically.
      </p>
      <button
        class="rounded-xl bg-shazam-500/20 px-5 py-2.5 text-sm font-medium text-shazam-400 hover:bg-shazam-500/30"
        @click="showAddForm = true"
      >
        Add Your First Project
      </button>
    </div>

    <!-- Remove confirmation bar -->
    <div v-if="confirmingRemove" class="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
      <span class="text-sm text-red-400">Remove "{{ confirmingRemove }}"? This won't delete any files.</span>
      <div class="flex items-center gap-2">
        <button
          class="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
          @click="cancelRemove"
        >
          Cancel
        </button>
        <button
          class="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
          @click="confirmRemove"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Project list -->
    <div v-if="projects.length > 0" class="grid gap-4">
      <ProjectCard
        v-for="project in projects"
        :key="project.name"
        :project="project"
        :loading="actionLoading === project.name"
        :sync-status="syncStatus[project.name] ?? 'idle'"
        @start="start(project.name)"
        @stop="stop(project.name)"
        @open="select(project.name)"
        @remove="handleRemove(project.name)"
        @sync="syncProjectConfig(project.name)"
      />
    </div>
  </div>
</template>

<style scoped>
.fade-up-enter-active { transition: all 0.2s ease-out; }
.fade-up-leave-active { transition: all 0.15s ease-in; }
.fade-up-enter-from { opacity: 0; transform: translateY(-8px); }
.fade-up-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
