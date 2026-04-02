import { computed, ref, onMounted, onUnmounted } from 'vue';
import { fetchSessionPool } from '@/api/configService';
import { useAsyncState, useDebouncedRefresh } from './useAsyncState';
import { useWebSocket } from './useWebSocket';

// ─── Types ──────────────────────────────────────────────

export interface SessionRow {
  key: string;
  agent_name: string;
  task_count: number;
  last_used: string;
  idle: boolean;
}

export interface ColorSet {
  bg: string;
  text: string;
  ring: string;
}

// ─── Constants ──────────────────────────────────────────

const AGENT_COLORS: ColorSet[] = [
  { bg: 'bg-shazam-500/15', text: 'text-shazam-400', ring: 'ring-shazam-500/30' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  { bg: 'bg-violet-500/15', text: 'text-violet-400', ring: 'ring-violet-500/30' },
  { bg: 'bg-sky-500/15', text: 'text-sky-400', ring: 'ring-sky-500/30' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-400', ring: 'ring-cyan-500/30' },
  { bg: 'bg-pink-500/15', text: 'text-pink-400', ring: 'ring-pink-500/30' },
];

const IDLE_COLOR: ColorSet = { bg: 'bg-gray-800', text: 'text-gray-500', ring: 'ring-gray-700/50' };

const SESSION_EVENTS = new Set([
  'agent_status_change',
  'task_completed',
  'task_started',
]);

// ─── Helpers ────────────────────────────────────────────

export function formatIdleTime(lastUsed: string, nowMs: number): string {
  const diff = nowMs - new Date(lastUsed).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours < 24) return remainMinutes > 0 ? `${hours}h ${remainMinutes}m ago` : `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatIdleShort(lastUsed: string, nowMs: number): string {
  const diff = nowMs - new Date(lastUsed).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function agentInitials(name: string): string {
  const parts = name.replace(/_/g, ' ').split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function agentColor(name: string, idle: boolean): ColorSet {
  if (idle) return IDLE_COLOR;
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AGENT_COLORS[hash % AGENT_COLORS.length] as ColorSet;
}

// ─── Composable ─────────────────────────────────────────

export function useSessions() {
  const ws = useWebSocket();

  const { data: pool, isLoading, error, execute: loadPool } = useAsyncState(
    () => fetchSessionPool(),
    { fallbackError: 'Failed to load session pool' },
  );

  // Live elapsed timer
  const now = ref(Date.now());
  let tickTimer: ReturnType<typeof setInterval> | null = null;

  // Auto-refresh on relevant WS events
  const [debouncedRefresh, cleanupDebounce] = useDebouncedRefresh(() => loadPool());

  ws.on('*', (event) => {
    if (SESSION_EVENTS.has(event.type)) {
      debouncedRefresh();
    }
  });

  // ─── Computed ───────────────────────────────────────────

  const sessions = computed<SessionRow[]>(() => {
    if (!pool.value?.sessions) return [];
    return Object.entries(pool.value.sessions)
      .map(([key, session]) => ({ key, ...session }))
      .sort((a, b) => {
        if (a.idle !== b.idle) return a.idle ? 1 : -1;
        return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
      });
  });

  const activeSessions = computed(() => sessions.value.filter((s) => !s.idle));
  const idleSessions = computed(() => sessions.value.filter((s) => s.idle));
  const totalTasks = computed(() => sessions.value.reduce((sum, s) => sum + s.task_count, 0));
  const activeCount = computed(() => pool.value?.active_sessions ?? 0);

  function utilizationPercent(taskCount: number): number {
    if (totalTasks.value === 0) return 0;
    return Math.round((taskCount / totalTasks.value) * 100);
  }

  // ─── Lifecycle ──────────────────────────────────────────

  onMounted(async () => {
    try {
      await loadPool();
    } catch (err) {
      console.warn('Failed to load session pool on mount:', err);
    }
    tickTimer = setInterval(() => { now.value = Date.now(); }, 1000);
  });

  onUnmounted(() => {
    if (tickTimer) clearInterval(tickTimer);
    cleanupDebounce();
  });

  return {
    // State
    pool,
    now,
    isLoading,
    error,
    ws,

    // Computed
    sessions,
    activeSessions,
    idleSessions,
    totalTasks,
    activeCount,

    // Actions
    loadPool,
    utilizationPercent,
  };
}
