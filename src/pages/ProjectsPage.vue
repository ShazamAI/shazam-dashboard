<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useActiveCompany } from '@/composables/useActiveCompany'
import { useWebSocket } from '@/composables/useWebSocket'
import { get, post, del } from '@/api/http'

interface Project {
  name: string
  path: string
  status: string
  config_file: string
  agents_count: number
  last_used: string | null
  registered_at: string | null
}

const projects = ref<Project[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const showAddForm = ref(false)
const newProjectPath = ref('')
const addingProject = ref(false)
const actionLoading = ref<string | null>(null)

const { selectCompany } = useActiveCompany()
const ws = useWebSocket()

async function loadProjects() {
  isLoading.value = true
  error.value = null
  try {
    const data = await get<{ projects: Project[] }>('/projects')
    projects.value = data.projects || []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load projects'
  } finally {
    isLoading.value = false
  }
}

async function addProject() {
  if (!newProjectPath.value.trim()) return
  addingProject.value = true
  try {
    await post('/projects', { path: newProjectPath.value.trim() })
    newProjectPath.value = ''
    showAddForm.value = false
    await loadProjects()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to add project'
  } finally {
    addingProject.value = false
  }
}

async function startProject(name: string) {
  actionLoading.value = name
  try {
    await post(`/projects/${encodeURIComponent(name)}/start`)
    selectCompany(name)
    ws.subscribeToProject(name)
    await loadProjects()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to start'
  } finally {
    actionLoading.value = null
  }
}

async function stopProject(name: string) {
  actionLoading.value = name
  try {
    await post(`/projects/${encodeURIComponent(name)}/stop`)
    await loadProjects()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to stop'
  } finally {
    actionLoading.value = null
  }
}

async function removeProject(name: string) {
  if (!confirm(`Remove "${name}" from the registry? This won't delete any files.`)) return
  try {
    await del(`/projects/${encodeURIComponent(name)}`)
    await loadProjects()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to remove'
  }
}

function selectProject(name: string) {
  selectCompany(name)
  ws.subscribeToProject(name)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

onMounted(() => {
  loadProjects()
  // Poll every 5s
  const timer = setInterval(loadProjects, 5000)
  return () => clearInterval(timer)
})
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
          class="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-gray-700 hover:text-white"
          @click="loadProjects"
        >
          <svg class="h-4 w-4" :class="isLoading ? 'animate-spin' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          class="flex items-center gap-2 rounded-xl bg-shazam-500/20 px-4 py-2.5 text-sm font-medium text-shazam-400 transition-all hover:bg-shazam-500/30"
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
    <div v-if="error" class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      {{ error }}
      <button class="ml-2 underline" @click="error = null">dismiss</button>
    </div>

    <!-- Add Project Form -->
    <Transition name="v-fade-up">
      <div v-if="showAddForm" class="rounded-xl border border-gray-700 bg-gray-800/50 p-5">
        <h3 class="text-sm font-medium text-gray-300 mb-3">Add a project directory</h3>
        <div class="flex gap-3">
          <input
            v-model="newProjectPath"
            type="text"
            placeholder="/Users/you/projects/my-project"
            class="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
            @keyup.enter="addProject"
          />
          <button
            class="rounded-lg bg-shazam-500 px-5 py-2.5 text-sm font-medium text-gray-950 transition-all hover:bg-shazam-400 disabled:opacity-50"
            :disabled="addingProject || !newProjectPath.trim()"
            @click="addProject"
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
        <p class="text-xs text-gray-500 mt-2">The directory must contain a <code class="text-gray-400">shazam.yaml</code> or <code class="text-gray-400">.shazam/shazam.yaml</code> file.</p>
      </div>
    </Transition>

    <!-- Project List -->
    <div v-if="isLoading && projects.length === 0" class="text-center py-12 text-gray-500">
      Loading projects...
    </div>

    <div v-else-if="projects.length === 0" class="text-center py-16">
      <div class="text-4xl mb-4">⚡</div>
      <h3 class="text-lg font-medium text-gray-300 mb-2">No projects registered</h3>
      <p class="text-sm text-gray-500 mb-6">Add a project directory or run <code class="text-gray-400">shazam</code> in a project to register it automatically.</p>
      <button
        class="rounded-xl bg-shazam-500/20 px-5 py-2.5 text-sm font-medium text-shazam-400 hover:bg-shazam-500/30"
        @click="showAddForm = true"
      >
        Add Your First Project
      </button>
    </div>

    <div v-else class="grid gap-4">
      <div
        v-for="project in projects"
        :key="project.name"
        class="group relative rounded-xl border transition-all duration-200 p-5"
        :class="project.status === 'running'
          ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'"
      >
        <div class="flex items-center justify-between">
          <!-- Left: project info -->
          <div class="flex items-center gap-4 min-w-0 flex-1">
            <!-- Status dot -->
            <div
              class="h-3 w-3 shrink-0 rounded-full"
              :class="project.status === 'running' ? 'bg-green-400 shadow-glow-green' : 'bg-gray-600'"
            />

            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold text-white truncate">{{ project.name }}</h3>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  :class="project.status === 'running'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-700 text-gray-400'"
                >
                  {{ project.status }}
                </span>
                <span v-if="project.agents_count" class="text-xs text-gray-500">
                  {{ project.agents_count }} agents
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5 truncate font-mono">{{ project.path }}</p>
              <p v-if="project.last_used" class="text-[10px] text-gray-600 mt-0.5">
                Last used: {{ formatDate(project.last_used) }}
              </p>
            </div>
          </div>

          <!-- Right: actions -->
          <div class="flex items-center gap-2 shrink-0 ml-4">
            <template v-if="project.status === 'running'">
              <button
                class="rounded-lg bg-shazam-500/20 px-4 py-2 text-xs font-medium text-shazam-400 hover:bg-shazam-500/30 transition-all"
                @click="selectProject(project.name)"
              >
                Open
              </button>
              <button
                class="rounded-lg border border-gray-600 px-4 py-2 text-xs font-medium text-gray-400 hover:bg-gray-700 hover:text-red-400 transition-all"
                :disabled="actionLoading === project.name"
                @click="stopProject(project.name)"
              >
                {{ actionLoading === project.name ? '...' : 'Stop' }}
              </button>
            </template>
            <template v-else>
              <button
                class="rounded-lg bg-green-500/20 px-4 py-2 text-xs font-medium text-green-400 hover:bg-green-500/30 transition-all"
                :disabled="actionLoading === project.name"
                @click="startProject(project.name)"
              >
                {{ actionLoading === project.name ? 'Starting...' : 'Start' }}
              </button>
            </template>
            <button
              class="rounded-lg p-2 text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
              title="Remove from registry"
              @click="removeProject(project.name)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shadow-glow-green {
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
}
.v-fade-up-enter-active { transition: all 0.2s ease-out; }
.v-fade-up-leave-active { transition: all 0.15s ease-in; }
.v-fade-up-enter-from { opacity: 0; transform: translateY(-8px); }
.v-fade-up-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
