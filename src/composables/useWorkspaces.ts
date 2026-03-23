import { ref, readonly, shallowReadonly, type Ref } from 'vue';
import { fetchWorkspaces, switchWorkspace } from '@/api/configService';
import type { WorkspaceInfo } from '@/types';
import { normalizeError } from '@/api/utils';

// ─── State ──────────────────────────────────────────────

const workspaces = ref<WorkspaceInfo[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const switchingTo = ref<string | null>(null);
let initialized = false;

// ─── Actions ────────────────────────────────────────────

async function loadWorkspaces(): Promise<void> {
  isLoading.value = true;
  error.value = null;
  try {
    workspaces.value = await fetchWorkspaces();
    initialized = true;
  } catch (err) {
    error.value = normalizeError(err, 'Failed to load workspaces');
  } finally {
    isLoading.value = false;
  }
}

/** Lazy-load workspaces only on first call */
async function ensureLoaded(): Promise<void> {
  if (!initialized) {
    await loadWorkspaces();
  }
}

async function handleSwitchWorkspace(name: string): Promise<void> {
  switchingTo.value = name;
  error.value = null;
  try {
    await switchWorkspace(name);
    workspaces.value = workspaces.value.map((ws) => ({
      ...ws,
      is_active: ws.name === name,
    }));
  } catch (err) {
    error.value = normalizeError(err, 'Failed to switch workspace');
  } finally {
    switchingTo.value = null;
  }
}

// ─── Public composable ──────────────────────────────────

export function useWorkspaces() {
  return {
    workspaces: shallowReadonly(workspaces) as Readonly<Ref<WorkspaceInfo[]>>,
    isLoading: readonly(isLoading),
    error: readonly(error),
    switchingTo: readonly(switchingTo),

    loadWorkspaces,
    ensureLoaded,
    handleSwitchWorkspace,
  };
}
