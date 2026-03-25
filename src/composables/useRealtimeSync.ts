/**
 * Global real-time sync — listens to WebSocket events and auto-refreshes stores.
 * Import once in App.vue. All pages benefit automatically.
 */
import { ref, watch } from 'vue';
import { useWebSocket } from './useWebSocket';
import { useActiveCompany } from './useActiveCompany';
import { useTaskStore } from '@/stores/tasks';
import { useAgentStore } from '@/stores/agents';
import { useEventStore } from '@/stores/events';

// Global reactive state for circuit breaker alert
export const circuitBreakerTripped = ref(false);

const TASK_EVENTS = new Set([
  'task_created', 'task_completed', 'task_failed', 'task_started',
  'task_approved', 'task_rejected', 'task_killed', 'task_paused',
  'task_resumed', 'task_status_change',
]);

const AGENT_EVENTS = new Set([
  'agent_status_change', 'agent_started', 'agent_stopped',
  'company_started', 'company_stopped',
]);

let initialized = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function useRealtimeSync() {
  if (initialized) return;
  initialized = true;

  const ws = useWebSocket();
  const { activeCompany, loadCompanies } = useActiveCompany();
  const taskStore = useTaskStore();
  const agentStore = useAgentStore();
  const eventStore = useEventStore();

  // Debounced refresh — prevents hammering the API on burst events
  function debouncedRefresh(fn: () => void, delay = 1000) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  }

  // Listen to ALL events and route to appropriate stores
  ws.on('*', (event) => {
    // Always process events in the event store (for Live Event Feed)
    eventStore.processEvent(event);

    const company = activeCompany.value?.name;

    // Task events → refresh task store
    if (TASK_EVENTS.has(event.type)) {
      debouncedRefresh(() => {
        if (company) {
          taskStore.load({ company });
        }
      });
    }

    // Agent events → refresh agent store
    if (AGENT_EVENTS.has(event.type)) {
      debouncedRefresh(() => {
        if (company) {
          agentStore.load(company);
        }
      }, 2000);
    }

    // Company events → refresh company list
    if (['company_started', 'company_stopped', 'company_updated'].includes(event.type)) {
      loadCompanies();
    }

    // Circuit breaker tripped → show alert with resume option
    if (event.type === 'circuit_breaker_tripped' || event.type === 'ralph_paused') {
      circuitBreakerTripped.value = true;
    }
    if (event.type === 'ralph_resumed') {
      circuitBreakerTripped.value = false;
    }
  });

  // When active project changes, re-subscribe and refresh everything
  watch(
    () => activeCompany.value?.name,
    async (name, oldName) => {
      if (name && name !== oldName) {
        ws.subscribeToProject(name);
        await Promise.allSettled([
          taskStore.load({ company: name }),
          agentStore.load(name),
        ]);
      }
    },
    { immediate: true }
  );
}
