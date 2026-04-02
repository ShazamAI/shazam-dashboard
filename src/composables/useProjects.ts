import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useActiveCompany } from './useActiveCompany';
import { useWebSocket } from './useWebSocket';
import { normalizeError } from '@/api/utils';
import * as api from '@/api/projectService';
import type { Project } from '@/types';

export function useProjects() {
  const router = useRouter();
  const { selectCompany } = useActiveCompany();
  const ws = useWebSocket();

  const projects = ref<Project[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const actionLoading = ref<string | null>(null);
  const syncStatus = ref<Record<string, 'idle' | 'syncing' | 'synced'>>({});

  let loadPromise: Promise<void> | null = null;

  async function load() {
    if (loadPromise) return loadPromise;
    isLoading.value = true;
    error.value = null;
    loadPromise = (async () => {
      try {
        projects.value = await api.fetchProjects();
      } catch (e) {
        error.value = normalizeError(e, 'Failed to load projects');
      } finally {
        isLoading.value = false;
        loadPromise = null;
      }
    })();
    return loadPromise;
  }

  async function add(path: string) {
    try {
      await api.addProject(path);
      await load();
    } catch (e) {
      error.value = normalizeError(e, 'Failed to add project');
    }
  }

  async function start(name: string) {
    actionLoading.value = name;
    try {
      await api.startProject(name);
      ws.subscribeToProject(name);
      selectCompany(name);
      await load();
      router.push('/dashboard');
    } catch (e) {
      error.value = normalizeError(e, 'Failed to start');
    } finally {
      actionLoading.value = null;
    }
  }

  async function stop(name: string) {
    actionLoading.value = name;
    try {
      await api.stopProject(name);
      await load();
    } catch (e) {
      error.value = normalizeError(e, 'Failed to stop');
    } finally {
      actionLoading.value = null;
    }
  }

  async function remove(name: string) {
    try {
      await api.removeProject(name);
      await load();
    } catch (e) {
      error.value = normalizeError(e, 'Failed to remove');
    }
  }

  function select(name: string) {
    selectCompany(name);
    ws.subscribeToProject(name);
    router.push('/dashboard');
  }

  async function syncProjectConfig(name: string) {
    syncStatus.value[name] = 'syncing';
    try {
      await api.syncProject(name);
      syncStatus.value[name] = 'synced';
    } catch (e) {
      error.value = normalizeError(e, 'Failed to sync');
      syncStatus.value[name] = 'idle';
    }
  }

  function dismissError() {
    error.value = null;
  }

  // Polling
  let timer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    load();
    timer = setInterval(load, 5000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return {
    projects,
    isLoading,
    error,
    actionLoading,
    syncStatus,
    load,
    add,
    start,
    stop,
    remove,
    select,
    syncProjectConfig,
    dismissError,
  };
}
