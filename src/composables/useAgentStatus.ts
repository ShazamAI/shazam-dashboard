import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useWebSocket } from './useWebSocket';
import { normalizeAgentStatus } from '@/api/agentService';
import type { AgentWorker, AgentStatus } from '@/types';

// ─── Sparkline ───────────────────────────────────────────

const SPARK_CHARS = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
const SPARKLINE_TICK_MS = 5_000;
const SPARKLINE_MAX_BUCKETS = 20;

export function getSparkline(data: number[] | undefined): string {
  if (!data || data.length === 0) return '\u2581\u2581\u2581\u2581\u2581';
  const max = Math.max(...data, 1);
  return data
    .slice(-10)
    .map((v) => SPARK_CHARS[Math.min(Math.floor((v / max) * 7), 7)])
    .join('');
}

// ─── Event Sets ──────────────────────────────────────────

const ACTIVE_EVENTS = new Set([
  'agent_text_delta', 'agent_text_complete', 'agent_output',
  'tool_use', 'tool_result',
]);

// ─── Composable ──────────────────────────────────────────

/**
 * Manages real-time agent status tracking via WebSocket events.
 * Handles status inference from lifecycle, task, and activity events.
 * Also tracks per-agent sparkline activity data.
 */
export function useAgentStatus(agents: Ref<AgentWorker[] | undefined>) {
  const ws = useWebSocket();
  const sparklineData = ref<Record<string, number[]>>({});

  // ─── Helpers ─────────────────────────────────────────

  function findAgent(name: string | null | undefined): AgentWorker | undefined {
    if (!name || !agents.value) return undefined;
    return agents.value.find((a) => a.name === name);
  }

  function updateStatus(agentName: string | null | undefined, status: AgentStatus) {
    const agent = findAgent(agentName);
    if (agent) agent.status = status;
  }

  function extractAgentName(event: { agent: string | null; data: unknown }): string | undefined {
    const data = (event.data && typeof event.data === 'object' ? event.data : {}) as Record<string, unknown>;
    return event.agent ?? (data.agent as string | undefined) ?? (data.agent_name as string | undefined) ?? undefined;
  }

  // ─── Sparkline tracking ──────────────────────────────

  function trackActivity(agentName: string) {
    if (!sparklineData.value[agentName]) {
      sparklineData.value[agentName] = [];
    }
    const current = sparklineData.value[agentName];
    if (current) {
      const lastIdx = current.length - 1;
      if (lastIdx >= 0) {
        current[lastIdx] = (current[lastIdx] ?? 0) + 1;
      } else {
        current.push(1);
      }
    }
  }

  // ─── WebSocket handler ───────────────────────────────

  ws.on('*', (event) => {
    const data = (event.data && typeof event.data === 'object' ? event.data : {}) as Record<string, unknown>;
    const agentName = extractAgentName(event);

    // Track activity for sparklines
    if (agentName) trackActivity(agentName);

    // Explicit status change
    if (event.type === 'agent_status_change') {
      const rawStatus = (data.to ?? data.status) as string | undefined;
      if (agentName && rawStatus) {
        updateStatus(agentName, normalizeAgentStatus(rawStatus));
      }
      return;
    }

    // Agent lifecycle events
    if (event.type === 'agent_started') { updateStatus(agentName, 'idle'); return; }
    if (event.type === 'agent_stopped' || event.type === 'agent_disconnected') { updateStatus(agentName, 'offline'); return; }
    if (event.type === 'agent_error' || event.type === 'agent_crashed') { updateStatus(agentName, 'error'); return; }
    if (event.type === 'agent_paused') { updateStatus(agentName, 'paused'); return; }
    if (event.type === 'agent_resumed') { updateStatus(agentName, 'working'); return; }

    // Infer status from active work events
    if (ACTIVE_EVENTS.has(event.type) && agentName) {
      const agent = findAgent(agentName);
      if (agent && (agent.status === 'idle' || agent.status === 'waiting')) {
        agent.status = event.type === 'tool_use' ? 'executing' : 'working';
      }
    }

    // Infer status from task lifecycle events
    if (event.type === 'task_started' || event.type === 'task_status_change') {
      const assignee = (data.assigned_to as string | undefined) ?? agentName;
      const toStatus = (data.to ?? data.status) as string | undefined;
      if (event.type === 'task_started' || toStatus === 'in_progress') {
        updateStatus(assignee, 'working');
      } else if (toStatus === 'awaiting_approval') {
        updateStatus(assignee, 'waiting');
      }
      return;
    }
    if (event.type === 'task_completed' || event.type === 'task_failed') {
      const assignee = (data.assigned_to as string | undefined) ?? agentName;
      updateStatus(assignee, 'idle');
      return;
    }

    // Token/budget updates
    if (event.type === 'metrics_update' && agentName) {
      const agent = findAgent(agentName);
      if (agent) {
        if (typeof data.tokens_used === 'number') agent.tokens_used = data.tokens_used;
        if (typeof data.budget === 'number') agent.budget = data.budget;
      }
    }
  });

  // ─── Sparkline timer ─────────────────────────────────

  let sparklineTimer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    sparklineTimer = setInterval(() => {
      for (const name of Object.keys(sparklineData.value)) {
        const arr = sparklineData.value[name];
        if (arr) {
          arr.push(0);
          if (arr.length > SPARKLINE_MAX_BUCKETS) arr.shift();
        }
      }
    }, SPARKLINE_TICK_MS);
  });

  onUnmounted(() => {
    if (sparklineTimer) clearInterval(sparklineTimer);
  });

  return {
    sparklineData,
    getSparkline: (agentName: string) => getSparkline(sparklineData.value[agentName]),
  };
}
