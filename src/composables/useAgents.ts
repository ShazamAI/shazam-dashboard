import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useActiveCompany } from './useActiveCompany';
import { useAgentStatus } from './useAgentStatus';
import {
  loadAndEnrichAgents,
  submitCreateAgent,
  submitUpdateAgent,
} from '@/api/agentService';
import type { AgentWorker, CreateAgentPayload } from '@/types';

const LOADING_TIMEOUT_MS = 8_000;

/**
 * Full agents page composable — data loading, CRUD, form state,
 * real-time status updates, and sparkline tracking.
 */
export function useAgents() {
  const { activeCompany, loadCompanies } = useActiveCompany();

  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const agents = ref<AgentWorker[]>([]);
  const showCreateForm = ref(false);
  const showEditForm = ref<string | null>(null);
  const isSubmitting = ref(false);

  // Real-time status tracking
  const { sparklineData, getSparkline } = useAgentStatus(agents);

  // ─── Form State ────────────────────────────────────────

  const formData = ref<CreateAgentPayload>({
    name: '',
    role: 'senior_dev',
    supervisor: null,
    domain: null,
    system_prompt: null,
    model: null,
    provider: null,
    tools: [],
    modules: [],
    budget: 100000,
  });

  function resetForm() {
    formData.value = {
      name: '',
      role: 'senior_dev',
      supervisor: null,
      domain: null,
      system_prompt: null,
      model: null,
      provider: null,
      tools: [],
      modules: [],
      budget: 100000,
    };
  }

  function openCreateForm() {
    resetForm();
    showCreateForm.value = true;
    showEditForm.value = null;
  }

  function openEditForm(agent: AgentWorker) {
    formData.value = {
      name: agent.name,
      role: agent.role,
      supervisor: agent.supervisor,
      domain: agent.domain,
      system_prompt: agent.system_prompt,
      model: agent.model,
      provider: agent.provider,
      tools: [...agent.tools],
      modules: [...agent.modules],
      budget: agent.budget,
    };
    showEditForm.value = agent.name;
    showCreateForm.value = false;
  }

  function closeForm() {
    showCreateForm.value = false;
    showEditForm.value = null;
    resetForm();
  }

  function toggleTool(tool: string) {
    const idx = formData.value.tools?.indexOf(tool) ?? -1;
    if (idx >= 0) {
      formData.value.tools?.splice(idx, 1);
    } else {
      formData.value.tools = [...(formData.value.tools ?? []), tool];
    }
  }

  // ─── Data Loading ──────────────────────────────────────

  async function fetchAgents() {
    if (!activeCompany.value) return;
    try {
      agents.value = await loadAndEnrichAgents(activeCompany.value.name);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load agents';
    }
  }

  async function loadData() {
    try {
      await loadCompanies();
      if (activeCompany.value) {
        await fetchAgents();
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      isLoading.value = false;
    }
  }

  // ─── CRUD Operations ──────────────────────────────────

  async function handleCreateAgent() {
    if (!formData.value.name.trim() || !activeCompany.value) return;
    isSubmitting.value = true;
    error.value = null;
    try {
      await submitCreateAgent(activeCompany.value.name, formData.value);
      closeForm();
      await fetchAgents();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create agent';
    } finally {
      isSubmitting.value = false;
    }
  }

  async function handleUpdateAgent() {
    if (!showEditForm.value || !activeCompany.value) return;
    isSubmitting.value = true;
    error.value = null;
    try {
      await submitUpdateAgent(activeCompany.value.name, formData.value as Partial<AgentWorker>);
      closeForm();
      await fetchAgents();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update agent';
    } finally {
      isSubmitting.value = false;
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────

  let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

  onMounted(() => {
    loadingTimeout = setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false;
        error.value = 'Loading timed out — backend may be unavailable';
      }
    }, LOADING_TIMEOUT_MS);

    loadData().then(() => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
    });
  });

  watch(() => activeCompany.value, (newCompany) => {
    if (newCompany) fetchAgents();
  });

  onUnmounted(() => {
    if (loadingTimeout) clearTimeout(loadingTimeout);
  });

  return {
    // State
    agents,
    isLoading,
    error,
    isSubmitting,
    showCreateForm,
    showEditForm,
    formData,

    // Sparkline
    sparklineData,
    getSparkline,

    // Form actions
    openCreateForm,
    openEditForm,
    closeForm,
    toggleTool,

    // CRUD
    handleCreateAgent,
    handleUpdateAgent,
  };
}
