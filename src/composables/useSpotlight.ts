import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useActiveCompany } from './useActiveCompany';

// Callback for actions that need external state (e.g., opening modals)
const actionCallbacks = ref<Record<string, () => void>>({});

/** Register a callback for a spotlight action (call from composables that own the state) */
export function registerSpotlightAction(id: string, callback: () => void) {
  actionCallbacks.value[id] = callback;
}

export interface SpotlightItem {
  id: string;
  type: 'page' | 'agent' | 'task' | 'action' | 'plan';
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
}

const isOpen = ref(false);
const query = ref('');
const selectedIndex = ref(0);

export function useSpotlight() {
  const router = useRouter();
  const { activeCompany } = useActiveCompany();

  // Static navigation items
  const navigationItems: SpotlightItem[] = [
    { id: 'nav-projects', type: 'page', title: 'Projects', subtitle: 'Manage projects', icon: '📁', action: () => router.push('/') },
    { id: 'nav-dashboard', type: 'page', title: 'Dashboard', subtitle: 'Overview & stats', icon: '📊', action: () => router.push('/dashboard') },
    { id: 'nav-tasks', type: 'page', title: 'Tasks', subtitle: 'View all tasks', icon: '📋', action: () => router.push('/tasks') },
    { id: 'nav-agents', type: 'page', title: 'Agents', subtitle: 'Agent management', icon: '🤖', action: () => router.push('/agents') },
    { id: 'nav-canvas', type: 'page', title: 'Canvas', subtitle: 'Visual workspace', icon: '🎨', action: () => router.push('/canvas') },
    { id: 'nav-orgchart', type: 'page', title: 'Org Chart', subtitle: 'Agent hierarchy', icon: '🏢', action: () => router.push('/org-chart') },
    { id: 'nav-workflows', type: 'page', title: 'Workflows', subtitle: 'Pipeline templates', icon: '⚡', action: () => router.push('/workflows') },
    { id: 'nav-plans', type: 'page', title: 'Plans', subtitle: 'Execution plans', icon: '📝', action: () => router.push('/plans') },
    { id: 'nav-config', type: 'page', title: 'Config', subtitle: 'Settings', icon: '⚙️', action: () => router.push('/config') },
    { id: 'nav-metrics', type: 'page', title: 'Metrics', subtitle: 'Token usage & stats', icon: '📈', action: () => router.push('/metrics') },
    { id: 'nav-files', type: 'page', title: 'Files', subtitle: 'File browser', icon: '📂', action: () => router.push('/files') },
    { id: 'nav-memory', type: 'page', title: 'Memory', subtitle: 'Agent memory bank', icon: '🧠', action: () => router.push('/memory') },
    { id: 'nav-output', type: 'page', title: 'Agent Output', subtitle: 'Terminal output', icon: '💻', action: () => router.push('/agent-output') },
    { id: 'nav-sessions', type: 'page', title: 'Sessions', subtitle: 'Session pool', icon: '🔌', action: () => router.push('/sessions') },
  ];

  // Quick actions (shown first)
  const actionItems: SpotlightItem[] = [
    { id: 'act-create-task', type: 'action', title: 'New Task', subtitle: 'Create a new task', icon: '➕', action: () => { close(); actionCallbacks.value['create-task']?.(); } },
    { id: 'act-create-plan', type: 'action', title: 'New Plan', subtitle: 'Start a new execution plan', icon: '📝', action: () => { close(); router.push('/plans'); } },
    { id: 'act-sync', type: 'action', title: 'Sync Configs', subtitle: 'Sync IDE agent configs', icon: '🔄', action: () => { close(); router.push('/'); } },
    { id: 'act-approve-all', type: 'action', title: 'Approve All Tasks', subtitle: 'Approve all pending tasks', icon: '✅', action: () => { close(); actionCallbacks.value['approve-all']?.(); } },
  ];

  // Dynamic items from agents
  const agentItems = computed<SpotlightItem[]>(() => {
    const agents = activeCompany.value?.agents ?? [];
    return agents.map(a => ({
      id: `agent-${a.name}`,
      type: 'agent' as const,
      title: a.name,
      subtitle: `${a.role} — ${a.status}`,
      icon: '🤖',
      action: () => { router.push({ path: '/agents', query: { highlight: a.name } }); close(); },
    }));
  });

  // All items combined — actions first for quick access
  const allItems = computed(() => [
    ...actionItems,
    ...navigationItems,
    ...agentItems.value,
  ]);

  // Filtered by query
  const filteredItems = computed(() => {
    const q = query.value.toLowerCase().trim();
    if (!q) return allItems.value.slice(0, 15);

    return allItems.value
      .filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle?.toLowerCase().includes(q) ?? false) ||
        item.type.includes(q)
      )
      .slice(0, 15);
  });

  function open() {
    query.value = '';
    selectedIndex.value = 0;
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
    query.value = '';
  }

  function selectItem(item: SpotlightItem) {
    item.action();
    close();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredItems.value.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems.value[selectedIndex.value];
      if (item) selectItem(item);
    }
  }

  // Reset selection when query changes
  watch(query, () => { selectedIndex.value = 0; });

  return {
    isOpen,
    query,
    selectedIndex,
    filteredItems,
    open,
    close,
    selectItem,
    handleKeyDown,
  };
}
