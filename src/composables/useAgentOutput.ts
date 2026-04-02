import { ref, computed, watch, nextTick, onMounted, triggerRef } from 'vue';
import { useWebSocket } from '@/composables/useWebSocket';
import { useActiveCompany } from '@/composables/useActiveCompany';
import { sendMessageToAgent, loadAndEnrichAgents } from '@/api/agentService';
import type { ShazamEvent, AgentWorker, EventType } from '@/types';
import { getEventData, getEventDataOrString, getDataString } from '@/utils/eventGuards';

// ─── Types ───────────────────────────────────────────────

export interface OutputLine {
  id: string;
  type: 'text' | 'tool_use' | 'tool_result' | 'task_info' | 'complete' | 'error' | 'user_message';
  content: string;
  timestamp: string;
  agentName: string;
  taskId: string | null;
  toolName?: string;
  toolInput?: string;
  toolResult?: string;
  isStreaming?: boolean;
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  text: string;
  lineNumber?: number;
}

export interface AgentFileDiff {
  path: string;
  diffs: DiffLine[];
}

export type OutputLineType = OutputLine['type'];

const MAX_LINES = 500;

// ─── Quick Actions ──────────────────────────────────────

export const QUICK_ACTIONS = [
  { label: 'Continue', icon: '▶', prompt: 'Continue working on the current task.' },
  { label: 'Fix it', icon: '🔧', prompt: 'Fix the issue you encountered. Try a different approach if needed.' },
  { label: 'Explain', icon: '💡', prompt: 'Explain what you just did and why.' },
  { label: 'Run tests', icon: '🧪', prompt: 'Run the test suite and report results.' },
  { label: 'Commit', icon: '📦', prompt: 'Create a git commit with a clear message for the changes you made.' },
] as const;

// ─── Display helpers ─────────────────────────────────────

export function getStatusColor(status: string): string {
  switch (status) {
    case 'busy': case 'working': case 'executing': return 'bg-shazam-500';
    case 'idle': return 'bg-emerald-500';
    case 'waiting': case 'paused': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    case 'offline': return 'bg-gray-600';
    default: return 'bg-gray-500';
  }
}

export function getLineColor(type: string): string {
  switch (type) {
    case 'text': return 'text-gray-300';
    case 'tool_use': return 'text-purple-400';
    case 'tool_result': return 'text-cyan-400';
    case 'task_info': return 'text-shazam-400';
    case 'complete': return 'text-emerald-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

export function getLinePrefix(type: string): string {
  switch (type) {
    case 'text': return '>';
    case 'tool_use': return '$';
    case 'tool_result': return '<';
    case 'task_info': return '#';
    case 'complete': return '*';
    case 'error': return '!';
    default: return '.';
  }
}

// ─── Safe handler wrapper ────────────────────────────────

function safeHandler<T>(handler: (event: T) => void): (event: T) => void {
  return (event: T) => {
    try {
      handler(event);
    } catch (err) {
      console.error('[AgentOutput] WS handler error:', err);
    }
  };
}

// ─── Composable ──────────────────────────────────────────

export function useAgentOutput() {
  const { activeCompany, loadCompanies } = useActiveCompany();
  const ws = useWebSocket();

  // ─── State ─────────────────────────────────────────────
  const selectedAgent = ref<string | null>(null);
  const outputLines = ref<Map<string, OutputLine[]>>(new Map());
  const expandedTools = ref<Set<string>>(new Set());
  const agents = ref<AgentWorker[]>([]);
  const agentDiffs = ref<Map<string, AgentFileDiff[]>>(new Map());
  const activeView = ref<'terminal' | 'changes'>('terminal');

  // ─── Auto-scroll ───────────────────────────────────────
  const terminalRef = ref<HTMLElement | null>(null);
  const autoScroll = ref(true);

  let lineIdCounter = 0;
  function nextLineId(): string {
    return `line-${++lineIdCounter}-${Date.now()}`;
  }

  // ─── Computed ──────────────────────────────────────────

  const currentLines = computed<OutputLine[]>(() => {
    if (!selectedAgent.value) return [];
    return outputLines.value.get(selectedAgent.value) ?? [];
  });

  const currentAgent = computed<AgentWorker | undefined>(() => {
    if (!selectedAgent.value) return undefined;
    return agents.value.find((a) => a.name === selectedAgent.value);
  });

  const currentTask = computed<string | null>(() => {
    const lines = currentLines.value;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i]?.taskId) return lines[i]!.taskId;
    }
    return null;
  });

  const agentHasOutput = computed(() => {
    const result: Record<string, number> = {};
    for (const [name, lines] of outputLines.value) {
      result[name] = lines.length;
    }
    return result;
  });

  const currentDiffs = computed<AgentFileDiff[]>(() => {
    if (!selectedAgent.value) return [];
    return agentDiffs.value.get(selectedAgent.value) ?? [];
  });

  const currentDiffCount = computed<number>(() => {
    return currentDiffs.value.reduce((sum, f) => sum + f.diffs.filter(d => d.type !== 'context').length, 0);
  });

  // ─── Scroll management ────────────────────────────────
  function scrollToBottom() {
    if (!autoScroll.value || !terminalRef.value) return;
    nextTick(() => {
      if (terminalRef.value) {
        terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
      }
    });
  }

  function handleScroll() {
    if (!terminalRef.value) return;
    const el = terminalRef.value;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    autoScroll.value = atBottom;
  }

  // Watch line count instead of deep watching the array
  watch(() => currentLines.value.length, () => scrollToBottom());

  // ─── Tool expand/collapse ─────────────────────────────
  function toggleTool(lineId: string) {
    if (expandedTools.value.has(lineId)) {
      expandedTools.value.delete(lineId);
    } else {
      expandedTools.value.add(lineId);
    }
  }

  // ─── Internal helpers ─────────────────────────────────
  function addLine(agentName: string, line: OutputLine) {
    if (!outputLines.value.has(agentName)) {
      outputLines.value.set(agentName, []);
    }
    const lines = outputLines.value.get(agentName)!;
    lines.push(line);
    if (lines.length > MAX_LINES) {
      lines.splice(0, lines.length - MAX_LINES);
    }
    // Force reactivity — Map mutations may not trigger computed re-evaluation
    triggerRef(outputLines);
  }

  // ─── WebSocket Event Handlers ─────────────────────────
  // ws.on (onScoped) already handles cleanup via onUnmounted in useWebSocket

  ws.on('agent_text_delta', safeHandler((event: ShazamEvent) => {
    const agent = event.agent ?? 'unknown';
    const data = getEventDataOrString(event);
    const text = typeof data === 'string' ? data : (getDataString(event, 'text') || getDataString(event, 'delta'));

    const lines = outputLines.value.get(agent);
    const streamingLine = lines?.find(l => l.isStreaming && l.agentName === agent);

    if (streamingLine) {
      streamingLine.content += text;
      streamingLine.timestamp = event.timestamp;
      triggerRef(outputLines);
    } else {
      addLine(agent, {
        id: nextLineId(),
        type: 'text',
        content: text,
        timestamp: event.timestamp,
        agentName: agent,
        taskId: event.task_id,
        isStreaming: true,
      });
    }
  }));

  ws.on('agent_text_complete', safeHandler((event: ShazamEvent) => {
    const agent = event.agent ?? 'unknown';
    const data = getEventDataOrString(event);
    const text = typeof data === 'string' ? data : (getDataString(event, 'text') || getDataString(event, 'output'));

    const lines = outputLines.value.get(agent);
    const streamingLine = lines?.find(l => l.isStreaming && l.agentName === agent);

    if (streamingLine) {
      streamingLine.content = text || streamingLine.content;
      streamingLine.isStreaming = false;
      streamingLine.type = 'complete';
      streamingLine.timestamp = event.timestamp;
      triggerRef(outputLines);
    } else {
      addLine(agent, {
        id: nextLineId(),
        type: 'complete',
        content: text,
        timestamp: event.timestamp,
        agentName: agent,
        taskId: event.task_id,
      });
    }
  }));

  ws.on('agent_output', safeHandler((event: ShazamEvent) => {
    const agent = event.agent ?? 'unknown';
    const data = getEventDataOrString(event);
    const text = typeof data === 'string' ? data : (getDataString(event, 'text') || getDataString(event, 'output'));

    const lines = outputLines.value.get(agent);
    const streamingLine = lines?.find(l => l.isStreaming && l.agentName === agent);

    if (streamingLine) {
      streamingLine.content = text || streamingLine.content;
      streamingLine.isStreaming = false;
      streamingLine.timestamp = event.timestamp;
      triggerRef(outputLines);
    } else {
      addLine(agent, {
        id: nextLineId(),
        type: 'text',
        content: text,
        timestamp: event.timestamp,
        agentName: agent,
        taskId: event.task_id,
      });
    }
  }));

  ws.on('tool_use', safeHandler((event: ShazamEvent) => {
    const agent = event.agent ?? 'unknown';
    const d = getEventData(event);
    const toolName = (d.tool_name ?? d.name ?? 'unknown') as string;
    const input = d.input ?? d.arguments;
    const inputStr = input ? JSON.stringify(input, null, 2) : '';

    addLine(agent, {
      id: nextLineId(),
      type: 'tool_use',
      content: `${toolName}()`,
      timestamp: event.timestamp,
      agentName: agent,
      taskId: event.task_id,
      toolName,
      toolInput: inputStr,
    });

    // Track file diffs for Edit/Write tool uses
    if (input && typeof input === 'object' && ['Edit', 'Write', 'edit', 'write'].includes(toolName)) {
      const inp = input as Record<string, unknown>;
      const filePath = (inp.file_path ?? inp.path ?? '') as string;
      if (filePath) {
        const diffLines: DiffLine[] = [];
        const oldStr = (inp.old_string ?? '') as string;
        const newStr = (inp.new_string ?? inp.content ?? '') as string;

        if (oldStr) {
          for (const line of oldStr.split('\n')) {
            diffLines.push({ type: 'remove', text: line });
          }
        }
        if (newStr) {
          for (const line of newStr.split('\n')) {
            diffLines.push({ type: 'add', text: line });
          }
        }

        if (diffLines.length > 0) {
          if (!agentDiffs.value.has(agent)) {
            agentDiffs.value.set(agent, []);
          }
          const files = agentDiffs.value.get(agent)!;
          const existing = files.find(f => f.path === filePath);
          if (existing) {
            existing.diffs.push(...diffLines);
          } else {
            files.push({ path: filePath, diffs: diffLines });
          }
          triggerRef(agentDiffs);
        }
      }
    }
  }));

  ws.on('tool_result', safeHandler((event: ShazamEvent) => {
    const agent = event.agent ?? 'unknown';
    const data = getEventDataOrString(event);
    const d = getEventData(event);
    const toolName = typeof data === 'object' ? (d.tool_name ?? d.name ?? '') as string : '';
    const result = typeof data === 'string' ? data : (d.result ?? d.output ?? d.content ?? '');
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

    addLine(agent, {
      id: nextLineId(),
      type: 'tool_result',
      content: toolName ? `${toolName} returned` : 'Tool result',
      timestamp: event.timestamp,
      agentName: agent,
      taskId: event.task_id,
      toolName: toolName || undefined,
      toolResult: resultStr.slice(0, 2000),
    });
  }));

  // Track task events for context
  const TASK_EVENTS: EventType[] = ['task_started', 'task_completed', 'task_failed', 'task_created', 'task_status_change'];
  for (const eventType of TASK_EVENTS) {
    ws.on(eventType, safeHandler((event: ShazamEvent) => {
      const agent = event.agent;
      if (!agent) return;
      const title = (getDataString(event, 'title') || getDataString(event, 'task_id') || event.task_id || '') as string;
      const status = (getDataString(event, 'status') || getDataString(event, 'to') || eventType.replace('task_', '')) as string;

      addLine(agent, {
        id: nextLineId(),
        type: eventType === 'task_failed' ? 'error' : 'task_info',
        content: `Task ${title}: ${status}`,
        timestamp: event.timestamp,
        agentName: agent,
        taskId: event.task_id,
      });
    }));
  }

  // Catch-all: capture any agent event not handled by specific handlers above
  const HANDLED_TYPES = new Set([
    'agent_text_delta', 'agent_text_complete', 'agent_output',
    'tool_use', 'tool_result', ...TASK_EVENTS,
    'heartbeat', 'ping', 'pong',
  ]);

  ws.on('*', safeHandler((event: ShazamEvent) => {
    const agent = event.agent;
    if (!agent || HANDLED_TYPES.has(event.type)) return;

    // Unhandled event with agent — log it so user sees activity
    const text = getDataString(event, 'text') || getDataString(event, 'title') || event.type;
    if (text) {
      addLine(agent, {
        id: nextLineId(),
        type: 'task_info',
        content: `[${event.type}] ${text}`,
        timestamp: event.timestamp,
        agentName: agent,
        taskId: event.task_id,
      });
    }
  }));

  // ─── Actions ───────────────────────────────────────────
  function clearOutput() {
    if (selectedAgent.value) {
      outputLines.value.set(selectedAgent.value, []);
    }
  }

  function selectAgent(name: string) {
    selectedAgent.value = name;
    autoScroll.value = true;
    nextTick(() => scrollToBottom());
  }

  function toggleAutoScroll() {
    autoScroll.value = !autoScroll.value;
    if (autoScroll.value) scrollToBottom();
  }

  // ─── Messaging ──────────────────────────────────────────
  const messageInput = ref('');
  const isSendingMessage = ref(false);
  const messageFeedback = ref<string | null>(null);

  async function sendMessage() {
    if (!selectedAgent.value || !messageInput.value.trim()) return;

    const text = messageInput.value.trim();
    isSendingMessage.value = true;
    messageFeedback.value = null;

    // Add user message line immediately
    addLine(selectedAgent.value, {
      id: nextLineId(),
      type: 'user_message',
      content: text,
      timestamp: new Date().toISOString(),
      agentName: selectedAgent.value,
      taskId: null,
    });

    try {
      const result = await sendMessageToAgent(
        selectedAgent.value,
        text,
        activeCompany.value?.name,
      );
      messageInput.value = '';
      if (result.status === 'queued') {
        messageFeedback.value = 'Message queued — agent is busy';
      }
    } catch (err) {
      messageFeedback.value = `Failed to send: ${err instanceof Error ? err.message : 'Unknown error'}`;
    } finally {
      isSendingMessage.value = false;
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────
  async function loadAgents(companyName: string) {
    try {
      agents.value = await loadAndEnrichAgents(companyName);
    } catch { /* silent */ }
  }

  onMounted(async () => {
    await loadCompanies();
    if (activeCompany.value?.name) {
      await loadAgents(activeCompany.value.name);
    }
    if (agents.value.length > 0 && !selectedAgent.value) {
      selectedAgent.value = agents.value[0]!.name;
    }
  });

  watch(() => activeCompany.value?.name, async (name) => {
    if (name) await loadAgents(name);
  });

  return {
    // State
    selectedAgent,
    agents,
    currentLines,
    currentAgent,
    currentTask,
    agentHasOutput,
    expandedTools,

    // Diff tracking
    activeView,
    currentDiffs,
    currentDiffCount,
    agentDiffs,

    // Scroll
    terminalRef,
    autoScroll,
    handleScroll,
    scrollToBottom,

    // Actions
    selectAgent,
    clearOutput,
    toggleTool,
    toggleAutoScroll,

    // Messaging
    messageInput,
    isSendingMessage,
    messageFeedback,
    sendMessage,

    // WebSocket
    ws,
  };
}
