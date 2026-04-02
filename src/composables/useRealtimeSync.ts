/**
 * Global real-time sync — listens to WebSocket events and emits debounced
 * refresh signals via reactive tick counters.
 *
 * Import once in App.vue. Page composables watch the tick refs to know when
 * to refresh their own data — no duplicate WS listeners or competing timers.
 */
import { ref, watch, type WatchStopHandle, type Ref } from 'vue';
import { useWebSocket } from './useWebSocket';
import { useNotifications } from './useNotifications';
import { useActiveCompany } from './useActiveCompany';
import { useEventFeed } from './useEventFeed';
import { getDataString } from '@/utils/eventGuards';
import { DEBOUNCE } from '@/constants/timing';

// ─── Global reactive signals ─────────────────────────────

/** Incremented (debounced) whenever a task-related WS event arrives */
export const taskRefreshTick: Ref<number> = ref(0);

/** Incremented (debounced) whenever an agent-related WS event arrives */
export const agentRefreshTick: Ref<number> = ref(0);

/** Global reactive state for circuit breaker alert */
export const circuitBreakerTripped = ref(false);

// ─── Event type sets ──────────────────────────────────────

const TASK_EVENTS = new Set([
  'task_created', 'task_completed', 'task_failed', 'task_started',
  'task_approved', 'task_rejected', 'task_killed', 'task_paused',
  'task_resumed', 'task_status_change',
  'task_stage_advanced', 'task_stage_rejected',
]);

const AGENT_EVENTS = new Set([
  'agent_status_change', 'agent_started', 'agent_stopped',
  'company_started', 'company_stopped',
]);

// ─── Module state ─────────────────────────────────────────

let initialized = false;
let taskDebounce: ReturnType<typeof setTimeout> | null = null;
let agentDebounce: ReturnType<typeof setTimeout> | null = null;
let unsubscribeWs: (() => void) | null = null;
let stopWatcher: WatchStopHandle | null = null;

/** Tear down listeners and allow re-initialization */
export function destroyRealtimeSync() {
  if (unsubscribeWs) { unsubscribeWs(); unsubscribeWs = null; }
  if (stopWatcher) { stopWatcher(); stopWatcher = null; }
  if (taskDebounce) { clearTimeout(taskDebounce); taskDebounce = null; }
  if (agentDebounce) { clearTimeout(agentDebounce); agentDebounce = null; }
  initialized = false;
}

export function useRealtimeSync() {
  if (initialized) return;
  initialized = true;

  const ws = useWebSocket();
  const { notify } = useNotifications();
  const { activeCompany, loadCompanies } = useActiveCompany();
  const eventFeed = useEventFeed();

  // Listen to ALL events and route appropriately
  unsubscribeWs = ws.on('*', (event) => {
    // Always process events in the event feed (for Live Event Feed)
    try { eventFeed.processEvent(event); } catch { /* protect other handlers */ }

    // Task events → debounced tick (pages watch taskRefreshTick)
    if (TASK_EVENTS.has(event.type)) {
      if (taskDebounce) clearTimeout(taskDebounce);
      taskDebounce = setTimeout(() => {
        taskRefreshTick.value++;
      }, DEBOUNCE.TASK_REFRESH);
    }

    // Agent events → debounced tick (pages watch agentRefreshTick)
    if (AGENT_EVENTS.has(event.type)) {
      if (agentDebounce) clearTimeout(agentDebounce);
      agentDebounce = setTimeout(() => {
        agentRefreshTick.value++;
      }, DEBOUNCE.AGENT_REFRESH);
    }

    // Company events → refresh company list
    try {
      if (['company_started', 'company_stopped', 'company_updated'].includes(event.type)) {
        loadCompanies();
      }
    } catch { /* silent */ }

    // Circuit breaker tripped → show alert with resume option
    if (event.type === 'circuit_breaker_tripped' || event.type === 'ralph_paused') {
      circuitBreakerTripped.value = true;
    }
    if (event.type === 'ralph_resumed') {
      circuitBreakerTripped.value = false;
    }

    // ─── Browser notifications (when tab is not focused) ────
    if (event.type === 'task_completed') {
      const title = getDataString(event, 'title') || event.task_id || 'Task';
      notify('Task completed', title, { tag: 'task-completed' });
    }
    if (event.type === 'task_failed') {
      const title = getDataString(event, 'title') || event.task_id || 'Task';
      notify('Task failed', title, { tag: 'task-failed' });
    }
    if (event.type === 'circuit_breaker_tripped') {
      notify('Circuit breaker tripped!', 'Execution has been paused due to consecutive failures.', { tag: 'circuit-breaker' });
    }
  });

  // When active project changes, re-subscribe and bump ticks so pages refresh
  stopWatcher = watch(
    () => activeCompany.value?.name,
    (name, oldName) => {
      if (name && name !== oldName) {
        ws.subscribeToProject(name);
        taskRefreshTick.value++;
        agentRefreshTick.value++;
      }
    },
    { immediate: true }
  );
}
