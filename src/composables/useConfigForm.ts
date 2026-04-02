import { ref, readonly, shallowReadonly, computed, watch, onUnmounted, type Ref } from 'vue';
import { fetchConfig, updateRalphLoopConfig, reloadPlugins } from '@/api/configService';
import type { ShazamConfig, RalphLoopConfig, PluginConfig, DomainConfig, AgentYamlConfig } from '@/types';
import { normalizeError } from '@/api/utils';

// ─── Constants ──────────────────────────────────────────

const LOAD_TIMEOUT_MS = 10_000;
const SAVE_SUCCESS_DURATION_MS = 3_000;

function defaultRalphLoopConfig(): RalphLoopConfig {
  return {
    auto_approve: false,
    auto_retry: true,
    max_concurrent: 4,
    max_retries: 2,
    poll_interval: 5000,
    module_lock: true,
    peer_reassign: true,
    qa_auto: true,
    context_history: 5,
    team_activity: 10,
    context_budget: 4000,
  };
}

// ─── Singleton state (shared if composable is called from multiple components) ──

const config = ref<ShazamConfig | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isFallbackData = ref(false);

const editableConfig = ref<RalphLoopConfig>(defaultRalphLoopConfig());
const isSaving = ref(false);
const saveSuccess = ref(false);

const isReloadingPlugins = ref(false);

let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
let saveSuccessTimeout: ReturnType<typeof setTimeout> | null = null;

// ─── Derived state ──────────────────────────────────────

const domainEntries = computed<[string, DomainConfig][]>(() => {
  if (!config.value?.domains) return [];
  return Object.entries(config.value.domains);
});

const agentEntries = computed<[string, AgentYamlConfig][]>(() => {
  if (!config.value?.agents) return [];
  return Object.entries(config.value.agents);
});

const techStackEntries = computed<[string, string | Record<string, string>][]>(() => {
  if (!config.value?.tech_stack) return [];
  return Object.entries(config.value.tech_stack);
});

const plugins = computed<PluginConfig[]>(() => config.value?.plugins ?? []);

// Sync editableConfig when config reloads externally
watch(
  () => config.value?.config,
  (newConfig) => {
    if (newConfig) {
      editableConfig.value = { ...defaultRalphLoopConfig(), ...newConfig };
    }
  },
);

// ─── Actions ────────────────────────────────────────────

async function loadConfig(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  isFallbackData.value = false;

  loadingTimeout = setTimeout(() => {
    if (isLoading.value) {
      isLoading.value = false;
      error.value = 'Loading timed out. The backend may be unavailable.';
    }
  }, LOAD_TIMEOUT_MS);

  try {
    config.value = await fetchConfig();

    // Detect fallback data (built from /companies instead of /config)
    if (
      config.value &&
      Object.keys(config.value.domains ?? {}).length === 0 &&
      Object.keys(config.value.tech_stack ?? {}).length === 0
    ) {
      isFallbackData.value = true;
    }

    if (config.value?.config) {
      editableConfig.value = { ...defaultRalphLoopConfig(), ...config.value.config };
    }
  } catch (err) {
    error.value = normalizeError(err, 'Failed to load configuration');
  } finally {
    if (loadingTimeout) clearTimeout(loadingTimeout);
    isLoading.value = false;
  }
}

async function saveRalphLoop(): Promise<void> {
  isSaving.value = true;
  saveSuccess.value = false;
  try {
    await updateRalphLoopConfig(editableConfig.value);
    saveSuccess.value = true;
    if (saveSuccessTimeout) clearTimeout(saveSuccessTimeout);
    saveSuccessTimeout = setTimeout(() => { saveSuccess.value = false; }, SAVE_SUCCESS_DURATION_MS);
  } catch (err) {
    error.value = normalizeError(err, 'Failed to save configuration');
  } finally {
    isSaving.value = false;
  }
}

async function handleReloadPlugins(): Promise<void> {
  isReloadingPlugins.value = true;
  try {
    const updated = await reloadPlugins();
    if (config.value) {
      config.value = { ...config.value, plugins: updated };
    }
  } catch (err) {
    error.value = normalizeError(err, 'Failed to reload plugins');
  } finally {
    isReloadingPlugins.value = false;
  }
}

function clearError(): void {
  error.value = null;
}

// ─── Public composable ──────────────────────────────────

export function useConfigForm() {
  onUnmounted(() => {
    if (loadingTimeout) clearTimeout(loadingTimeout);
    if (saveSuccessTimeout) clearTimeout(saveSuccessTimeout);
  });

  return {
    // State
    config: shallowReadonly(config) as Readonly<Ref<ShazamConfig | null>>,
    isLoading: readonly(isLoading),
    error: readonly(error),
    isFallbackData: readonly(isFallbackData),
    editableConfig,
    isSaving: readonly(isSaving),
    saveSuccess: readonly(saveSuccess),
    isReloadingPlugins: readonly(isReloadingPlugins),

    // Derived
    domainEntries,
    agentEntries,
    techStackEntries,
    plugins,

    // Actions
    loadConfig,
    saveRalphLoop,
    handleReloadPlugins,
    clearError,
  };
}
