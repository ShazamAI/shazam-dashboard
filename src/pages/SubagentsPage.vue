<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  fetchPresets,
  fetchAgentSubagents,
  updateAgentSubagents,
  TEAM_PRESETS,
  MODEL_OPTIONS,
  type SubagentConfig,
  type SubagentPreset,
} from '@/api/subagentService';
import { fetchAgents } from '@/api/companyService';
import { syncProject } from '@/api/projectService';
import { useActiveCompany } from '@/composables/useActiveCompany';

const { activeCompany, loadCompanies } = useActiveCompany();

// --- Default subagent definitions (fallback when API is unavailable) ---
const DEFAULT_SUBAGENTS: SubagentConfig[] = [
  { name: 'architect', enabled: false, model: 'opus', description: 'Designs system architecture, interfaces, and high-level structure', readonly: false, tools: ['read', 'search', 'web'], isCustom: false },
  { name: 'executor', enabled: false, model: 'sonnet', description: 'Implements code changes following the plan precisely', readonly: false, tools: ['read', 'write', 'bash'], isCustom: false },
  { name: 'reviewer', enabled: false, model: 'sonnet', description: 'Reviews code for quality, bugs, and best practices', readonly: true, tools: ['read', 'search'], isCustom: false },
  { name: 'explorer', enabled: false, model: 'haiku', description: 'Explores codebase, finds relevant files and patterns', readonly: true, tools: ['read', 'search', 'glob'], isCustom: false },
  { name: 'test-writer', enabled: false, model: 'sonnet', description: 'Writes comprehensive tests for new and existing code', readonly: false, tools: ['read', 'write', 'bash'], isCustom: false },
  { name: 'debugger', enabled: false, model: 'sonnet', description: 'Diagnoses and fixes bugs using logs and traces', readonly: false, tools: ['read', 'write', 'bash', 'search'], isCustom: false },
  { name: 'docs-writer', enabled: false, model: 'haiku', description: 'Writes and updates documentation and READMEs', readonly: false, tools: ['read', 'write'], isCustom: false },
  { name: 'security-auditor', enabled: false, model: 'opus', description: 'Audits code for security vulnerabilities and risks', readonly: true, tools: ['read', 'search', 'web'], isCustom: false },
  { name: 'refactorer', enabled: false, model: 'sonnet', description: 'Refactors code for clarity, performance, and maintainability', readonly: false, tools: ['read', 'write', 'search'], isCustom: false },
  { name: 'planner', enabled: false, model: 'opus', description: 'Creates detailed implementation plans and task breakdowns', readonly: true, tools: ['read', 'search'], isCustom: false },
  { name: 'analyst', enabled: false, model: 'opus', description: 'Analyzes requirements and identifies edge cases', readonly: true, tools: ['read', 'search', 'web'], isCustom: false },
  { name: 'designer', enabled: false, model: 'sonnet', description: 'Designs UI components, layouts, and user flows', readonly: false, tools: ['read', 'write', 'search'], isCustom: false },
];

// --- State ---
const subagents = ref<SubagentConfig[]>([]);
const isLoading = ref(true);
const showCustomForm = ref(false);
const showYamlModal = ref(false);
const toastMessage = ref('');
const toastVisible = ref(false);

// Agent subagent assignments
const agents = ref<Array<{ name: string; role: string }>>([]);
const agentSubagents = ref<Record<string, string[]>>({});

// Custom subagent form
const customForm = ref({
  name: '',
  description: '',
  model: 'sonnet',
  tools: '',
  readonly: false,
  prompt: '',
});

// --- Computed ---
const enabledCount = computed(() => subagents.value.filter((s) => s.enabled).length);
const totalCount = computed(() => subagents.value.length);

const generatedYaml = computed(() => {
  const enabled = subagents.value.filter((s) => s.enabled);
  let yaml = 'subagents:\n';
  for (const sa of enabled) {
    yaml += `  ${sa.name}:\n`;
    yaml += `    enabled: true\n`;
    yaml += `    model: ${sa.model}\n`;
    if (sa.readonly) yaml += `    readonly: true\n`;
    if (sa.tools && sa.tools.length > 0) {
      yaml += `    tools: [${sa.tools.join(', ')}]\n`;
    }
    if (sa.isCustom) {
      if (sa.description) yaml += `    description: "${sa.description}"\n`;
      if (sa.prompt) yaml += `    prompt: |\n      ${sa.prompt.split('\n').join('\n      ')}\n`;
    }
  }

  // Include per-agent subagent assignments
  const hasAssignments = agents.value.some(
    (a) => (agentSubagents.value[a.name] || []).length > 0,
  );
  if (hasAssignments) {
    yaml += '\nagents:\n';
    for (const agent of agents.value) {
      const subs = agentSubagents.value[agent.name] || [];
      if (subs.length > 0) {
        yaml += `  ${agent.name}:\n`;
        yaml += `    role: ${agent.role}\n`;
        yaml += `    subagents: [${subs.join(', ')}]\n`;
      }
    }
  }

  return yaml;
});

// --- Methods ---
function showToast(msg: string) {
  toastMessage.value = msg;
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
  }, 3000);
}

function applyTeamPreset(key: string) {
  const preset = TEAM_PRESETS[key];
  if (!preset) return;

  // Disable all first
  for (const sa of subagents.value) {
    sa.enabled = false;
  }
  // Enable the ones in the preset
  for (const name of preset.subagents) {
    const sa = subagents.value.find((s) => s.name === name);
    if (sa) sa.enabled = true;
  }
  showToast(`Applied "${preset.name}" preset`);
}

function addCustomSubagent() {
  if (!customForm.value.name.trim()) return;

  const toolsList = customForm.value.tools
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  subagents.value.push({
    name: customForm.value.name.trim().toLowerCase().replace(/\s+/g, '-'),
    enabled: true,
    model: customForm.value.model,
    description: customForm.value.description,
    readonly: customForm.value.readonly,
    tools: toolsList,
    prompt: customForm.value.prompt,
    isCustom: true,
  });

  // Reset form
  customForm.value = { name: '', description: '', model: 'sonnet', tools: '', readonly: false, prompt: '' };
  showCustomForm.value = false;
  showToast('Custom subagent added');
}

function removeCustomSubagent(name: string) {
  subagents.value = subagents.value.filter((s) => s.name !== name);
}

async function handleApplySync() {
  if (!activeCompany.value?.name) {
    showToast('No active project selected');
    return;
  }

  try {
    // A subagent is enabled if assigned to at least one agent
    const usedSubagentNames = new Set(
      Object.values(agentSubagents.value).flat()
    );
    const enabledSubagents = subagents.value
      .filter(s => usedSubagentNames.has(s.name))
      .map(s => ({
        name: s.name,
        enabled: true,
        model: s.model,
        description: s.description,
        readonly: s.readonly,
      }));

    const { post } = await import('@/api/http');
    await post('/save-subagents', {
      subagents: enabledSubagents,
      agent_assignments: agentSubagents.value,
      company: activeCompany.value.name,
    });

    showToast('Saved to shazam.yaml & synced');
  } catch {
    showToast('Failed to save — check connection');
  }
}

function resetToDefaults() {
  subagents.value = DEFAULT_SUBAGENTS.map((s) => ({ ...s, enabled: false, tools: [...(s.tools || [])] }));
  // Clear all agent assignments
  for (const agent of agents.value) {
    agentSubagents.value[agent.name] = [];
  }
  showToast('All subagents disabled');
}

async function copyYaml() {
  try {
    await navigator.clipboard.writeText(generatedYaml.value);
    showToast('YAML copied to clipboard');
  } catch {
    showToast('Failed to copy — select and copy manually');
  }
}

async function applyAndSync() {
  if (!activeCompany.value?.name) return;
  try {
    await syncProject(activeCompany.value.name);
    showToast('Sync triggered successfully');
    showYamlModal.value = false;
  } catch {
    showToast('Sync failed — check connection');
  }
}

function isAssigned(agentName: string, subagentName: string): boolean {
  return (agentSubagents.value[agentName] || []).includes(subagentName);
}

async function toggleAssignment(agentName: string, subagentName: string) {
  const current = agentSubagents.value[agentName] || [];
  if (current.includes(subagentName)) {
    agentSubagents.value[agentName] = current.filter((s) => s !== subagentName);
  } else {
    agentSubagents.value[agentName] = [...current, subagentName];
    // Auto-enable the subagent globally when assigned to any agent
    const sa = subagents.value.find(s => s.name === subagentName);
    if (sa && !sa.enabled) {
      sa.enabled = true;
    }
  }

  // If subagent is no longer assigned to ANY agent, auto-disable globally
  const stillUsed = agents.value.some(a =>
    (agentSubagents.value[a.name] || []).includes(subagentName)
  );
  if (!stillUsed) {
    const sa = subagents.value.find(s => s.name === subagentName);
    if (sa) sa.enabled = false;
  }

  // Persist to backend
  try {
    await updateAgentSubagents(agentName, agentSubagents.value[agentName]);
  } catch {
    showToast('Failed to save subagent assignment');
  }
}

function applyTeamToAgent(agentName: string, teamKey: string) {
  if (!teamKey) return;
  if (teamKey === '__clear__') {
    agentSubagents.value[agentName] = [];
    // Auto-disable subagents no longer used by any agent
    syncEnabledFromAssignments();
    showToast(`Cleared all subagents from ${agentName}`);
    return;
  }
  const preset = TEAM_PRESETS[teamKey];
  if (preset) {
    agentSubagents.value[agentName] = [...preset.subagents];
    // Auto-enable assigned subagents
    for (const name of preset.subagents) {
      const sa = subagents.value.find(s => s.name === name);
      if (sa) sa.enabled = true;
    }
    showToast(`Applied "${preset.name}" to ${agentName}`);
  }
}

function syncEnabledFromAssignments() {
  const usedNames = new Set(Object.values(agentSubagents.value).flat());
  for (const sa of subagents.value) {
    sa.enabled = usedNames.has(sa.name);
  }
}

// --- Computed: available presets for agent assignment pills ---
const availablePresets = computed(() => subagents.value.map((s) => ({ name: s.name, description: s.description })));

// --- Lifecycle ---
onMounted(async () => {
  try {
    const presets = await fetchPresets();
    if (presets.length > 0) {
      subagents.value = presets.map((p: SubagentPreset) => ({
        name: p.name,
        enabled: true,
        model: p.default_model || 'sonnet',
        description: p.description || '',
        readonly: p.readonly || false,
        tools: [],
        isCustom: false,
      }));
    } else {
      subagents.value = DEFAULT_SUBAGENTS.map((s) => ({ ...s, tools: [...(s.tools || [])] }));
    }
  } catch {
    subagents.value = DEFAULT_SUBAGENTS.map((s) => ({ ...s, tools: [...(s.tools || [])] }));
  } finally {
    isLoading.value = false;
  }

  // Ensure company is loaded (on F5, activeCompany may not be ready yet)
  if (!activeCompany.value?.name) {
    await loadCompanies();
  }

  // Load agents and their subagent assignments
  if (activeCompany.value?.name) {
    try {
      const agentList = await fetchAgents(activeCompany.value.name);
      agents.value = agentList.map((a) => ({ name: a.name, role: a.role }));

      for (const agent of agents.value) {
        try {
          const subs = await fetchAgentSubagents(agent.name);
          agentSubagents.value[agent.name] = subs;
        } catch {
          /* ignore */
        }
      }

      // Derive enabled state from assignments — a subagent is enabled only if assigned to at least one agent
      const usedNames = new Set(Object.values(agentSubagents.value).flat());
      for (const sa of subagents.value) {
        sa.enabled = usedNames.has(sa.name);
      }
    } catch {
      /* ignore */
    }
  } else {
    // No active company — all disabled
    for (const sa of subagents.value) {
      sa.enabled = false;
    }
  }
});
</script>

<template>
  <div class="subagents-page">
    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toastVisible"
        class="fixed right-4 top-4 z-[100] rounded-xl border border-shazam-500/30 bg-gray-900 px-4 py-2.5 text-sm text-shazam-400 shadow-lg"
      >
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- Page Header -->
    <div class="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="flex items-center gap-2.5 sm:gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-shazam-500/15 text-base ring-1 ring-shazam-500/30 sm:h-10 sm:w-10 sm:text-lg">
            <svg class="h-5 w-5 text-shazam-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.421 48.421 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.035 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
            </svg>
          </div>
          <div>
            <h1 class="page-title">Subagents</h1>
            <p class="page-subtitle">Configure specialized subagents for your autonomous workforce</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-shazam-500" />
    </div>

    <template v-else>
      <!-- Section: Agent Subagent Assignments -->
      <div v-if="agents.length > 0" class="mb-8">
        <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Agent Assignments</h2>
        <p class="mb-4 text-[10px] text-gray-600">Assign specialized subagents to each agent. They'll be referenced in the agent's IDE config.</p>

        <div class="space-y-3">
          <div
            v-for="agent in agents"
            :key="agent.name"
            class="rounded-xl border border-gray-800 bg-gray-900/30 p-4"
          >
            <div class="mb-3 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-white">{{ agent.name }}</h3>
                <p class="text-[10px] text-gray-500">{{ agent.role }}</p>
              </div>
              <div class="flex items-center gap-2">
                <!-- Team preset dropdown -->
                <select
                  class="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] text-gray-400"
                  @change="applyTeamToAgent(agent.name, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
                >
                  <option value="">Apply team...</option>
                  <option v-for="(preset, key) in TEAM_PRESETS" :key="key" :value="key">
                    {{ preset.name }}
                  </option>
                  <option value="__clear__">Clear all</option>
                </select>
                <span class="text-[10px] text-gray-600">{{ (agentSubagents[agent.name] || []).length }} subagents</span>
              </div>
            </div>

            <!-- Subagent pills (clickable to add/remove) -->
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="preset in availablePresets"
                :key="preset.name"
                class="rounded-full px-2.5 py-1 text-[10px] font-medium transition-all"
                :class="isAssigned(agent.name, preset.name)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-gray-600 hover:text-gray-400'"
                @click="toggleAssignment(agent.name, preset.name)"
              >
                {{ preset.name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Team Presets (informational) -->
      <div class="mb-8">
        <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Team Presets</h2>
        <p class="mb-3 text-[10px] text-gray-600">Pre-configured subagent bundles. Apply them to agents using the "Apply team..." dropdown above.</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="(preset, key) in TEAM_PRESETS"
            :key="key"
            class="rounded-xl border border-gray-800 bg-gray-900/30 p-4"
          >
            <h3 class="mb-1 text-sm font-semibold text-white">{{ preset.name }}</h3>
            <p class="mb-2 text-[10px] text-gray-500">{{ preset.description }}</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="sa in preset.subagents"
                :key="sa"
                class="rounded-full bg-gray-800 px-2 py-0.5 text-[9px] text-gray-400"
              >
                {{ sa }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Subagent Models -->
      <div class="mb-8">
        <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Subagent Models</h2>
        <p class="mb-4 text-[10px] text-gray-600">Configure which AI model each subagent type uses. Assign them to agents in the section above.</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="sa in subagents"
            :key="sa.name"
            class="rounded-xl border border-gray-800 bg-gray-900/30 p-4 transition-all hover:border-gray-700"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-white">{{ sa.name }}</h3>
                <span v-if="sa.readonly" class="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400">read-only</span>
                <span v-if="sa.isCustom" class="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-400">custom</span>
              </div>
              <button
                v-if="sa.isCustom"
                class="text-gray-600 hover:text-red-400 transition-colors"
                title="Remove custom subagent"
                @click="removeCustomSubagent(sa.name)"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p class="text-[10px] text-gray-500 mb-3 leading-relaxed">{{ sa.description }}</p>

            <div class="flex items-center gap-2">
              <label class="text-[10px] text-gray-600 shrink-0">Model:</label>
              <select
                v-model="sa.model"
                class="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-300"
              >
                <option v-for="m in MODEL_OPTIONS" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Custom Subagent -->
      <div class="mb-24">
        <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Custom Subagents</h2>

        <Transition name="slide">
          <div
            v-if="showCustomForm"
            class="mb-4 rounded-xl border border-gray-700 bg-gray-900/80 p-5"
          >
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-xs text-gray-400">Name</label>
                <input
                  v-model="customForm.name"
                  type="text"
                  placeholder="e.g. api-specialist"
                  class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-400">Model</label>
                <select
                  v-model="customForm.model"
                  class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                >
                  <option v-for="m in MODEL_OPTIONS" :key="m.value" :value="m.value">
                    {{ m.label }}
                  </option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="mb-1 block text-xs text-gray-400">Description</label>
                <input
                  v-model="customForm.description"
                  type="text"
                  placeholder="What does this subagent do?"
                  class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-400">Tools (comma-separated)</label>
                <input
                  v-model="customForm.tools"
                  type="text"
                  placeholder="read, write, bash, search"
                  class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                />
              </div>
              <div class="flex items-end">
                <label class="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
                  <input
                    v-model="customForm.readonly"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-600 bg-gray-800 text-shazam-500 focus:ring-shazam-500/30"
                  />
                  Read-only mode
                </label>
              </div>
              <div class="sm:col-span-2">
                <label class="mb-1 block text-xs text-gray-400">Custom Prompt (optional)</label>
                <textarea
                  v-model="customForm.prompt"
                  rows="3"
                  placeholder="Custom system prompt for this subagent..."
                  class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:border-shazam-500 focus:outline-none focus:ring-1 focus:ring-shazam-500/30"
                />
              </div>
            </div>

            <div class="mt-4 flex gap-3">
              <button
                class="rounded-lg bg-shazam-500 px-4 py-2 text-sm font-medium text-gray-950 transition-colors hover:bg-shazam-400 disabled:opacity-50"
                :disabled="!customForm.name.trim()"
                @click="addCustomSubagent"
              >
                Add Subagent
              </button>
              <button
                class="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
                @click="showCustomForm = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </Transition>

        <button
          v-if="!showCustomForm"
          class="flex items-center gap-2 rounded-xl border border-dashed border-gray-700 px-4 py-3 text-sm text-gray-500 transition-all hover:border-shazam-500/30 hover:text-shazam-400"
          @click="showCustomForm = true"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Custom Subagent
        </button>
      </div>

      <!-- Sticky Action Bar -->
      <div class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-gray-950/95 px-6 py-3 backdrop-blur-sm">
        <div class="mx-auto flex max-w-7xl items-center justify-between">
          <div class="text-sm text-gray-500">
            <span class="font-semibold text-shazam-400">{{ enabledCount }}</span>
            / {{ totalCount }} subagents enabled
          </div>
          <div class="flex items-center gap-3">
            <button
              class="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
              @click="resetToDefaults"
            >
              Reset to Defaults
            </button>
            <button
              class="rounded-lg bg-shazam-500 px-5 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-shazam-400"
              @click="handleApplySync"
            >
              Apply &amp; Sync
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- YAML Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showYamlModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/70 backdrop-blur-sm"
            @click="showYamlModal = false"
          />
          <div class="modal-content relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-700/50 bg-gray-900 shadow-2xl shadow-black/50">
            <div class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 px-6 py-4 backdrop-blur-sm">
              <div>
                <h2 class="text-base font-bold text-white">Apply Subagent Config</h2>
                <p class="mt-0.5 text-xs text-gray-500">Copy this YAML into your shazam.yaml</p>
              </div>
              <button
                class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-800 hover:text-white"
                @click="showYamlModal = false"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="p-6">
              <pre class="mb-4 overflow-x-auto rounded-xl border border-gray-700 bg-gray-950 p-4 text-xs text-gray-300"><code>{{ generatedYaml }}</code></pre>

              <div class="flex gap-3">
                <button
                  class="flex-1 rounded-lg bg-shazam-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition-colors hover:bg-shazam-400"
                  @click="copyYaml"
                >
                  Copy to Clipboard
                </button>
                <button
                  class="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
                  @click="applyAndSync"
                >
                  Trigger Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.subagent-card {
  animation: cardIn 0.3s ease-out both;
}

.subagent-card:nth-child(2) { animation-delay: 40ms; }
.subagent-card:nth-child(3) { animation-delay: 80ms; }
.subagent-card:nth-child(4) { animation-delay: 120ms; }
.subagent-card:nth-child(5) { animation-delay: 160ms; }
.subagent-card:nth-child(6) { animation-delay: 200ms; }
.subagent-card:nth-child(7) { animation-delay: 240ms; }
.subagent-card:nth-child(8) { animation-delay: 280ms; }

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Toast */
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* Slide form */
.slide-enter-active {
  transition: all 0.3s ease-out;
}
.slide-leave-active {
  transition: all 0.2s ease-in;
}
.slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Modal */
.modal-enter-active {
  transition: all 0.3s ease-out;
}
.modal-leave-active {
  transition: all 0.2s ease-in;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-content {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
.modal-leave-to .modal-content {
  transform: scale(0.98) translateY(5px);
  opacity: 0;
}
.modal-content {
  transition: all 0.3s ease-out;
}
</style>
