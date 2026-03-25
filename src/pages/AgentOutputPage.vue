<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useWebSocket } from '@/composables/useWebSocket';
import { useAgentStore } from '@/stores/agents';
import { useActiveCompany } from '@/composables/useActiveCompany';
import type { ShazamEvent, AgentWorker } from '@/types';

const agentStore = useAgentStore();
const { activeCompany, loadCompanies } = useActiveCompany();
const ws = useWebSocket();

// ─── State ──────────────────────────────────────────
const selectedAgent = ref<string | null>(null);
const outputLines = ref<Map<string, OutputLine[]>>(new Map());
const expandedTools = ref<Set<string>>(new Set());

interface OutputLine {
  id: string;
  type: 'text' | 'tool_use' | 'tool_result' | 'task_info' | 'complete' | 'error';
  content: string;
  timestamp: string;
  agentName: string;
  taskId: string | null;
  toolName?: string;
  toolInput?: string;
  toolResult?: string;
  isStreaming?: boolean;
}

let lineIdCounter = 0;
function nextLineId(): string {
  return `line-${++lineIdCounter}-${Date.now()}`;
}

// ─── Computed ───────────────────────────────────────
const agents = computed<AgentWorker[]>(() => agentStore.agents);

const currentLines = computed<OutputLine[]>(() => {
  if (!selectedAgent.value) return [];
  return outputLines.value.get(selectedAgent.value) ?? [];
});

const currentAgent = computed<AgentWorker | undefined>(() => {
  if (!selectedAgent.value) return undefined;
  return agentStore.findAgent(selectedAgent.value);
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

// ─── Auto-scroll ────────────────────────────────────
const terminalRef = ref<HTMLElement | null>(null);
const autoScroll = ref(true);

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

watch(currentLines, () => scrollToBottom(), { deep: true });

// ─── Tool expand/collapse ───────────────────────────
function toggleTool(lineId: string) {
  if (expandedTools.value.has(lineId)) {
    expandedTools.value.delete(lineId);
  } else {
    expandedTools.value.add(lineId);
  }
}

// ─── Helpers ────────────────────────────────────────
function addLine(agentName: string, line: OutputLine) {
  if (!outputLines.value.has(agentName)) {
    outputLines.value.set(agentName, []);
  }
  const lines = outputLines.value.get(agentName)!;
  lines.push(line);
  // Cap at 500 lines per agent
  if (lines.length > 500) {
    lines.splice(0, lines.length - 500);
  }
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--:--';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'busy': case 'working': case 'executing': return 'bg-shazam-500';
    case 'idle': return 'bg-emerald-500';
    case 'waiting': case 'paused': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    case 'offline': return 'bg-gray-600';
    default: return 'bg-gray-500';
  }
}

function getLineColor(type: string): string {
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

function getLinePrefix(type: string): string {
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

// ─── WebSocket Event Handlers ───────────────────────
ws.on('agent_text_delta', (event: ShazamEvent) => {
  const agent = event.agent ?? 'unknown';
  const data = event.data as Record<string, unknown> | string | null;
  const text = typeof data === 'string' ? data : (data?.text as string ?? data?.delta as string ?? '');

  // Find existing streaming line for this agent
  const lines = outputLines.value.get(agent);
  const streamingLine = lines?.find(l => l.isStreaming && l.agentName === agent);

  if (streamingLine) {
    streamingLine.content += text;
    streamingLine.timestamp = event.timestamp;
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
});

ws.on('agent_text_complete', (event: ShazamEvent) => {
  const agent = event.agent ?? 'unknown';
  const data = event.data as Record<string, unknown> | string | null;
  const text = typeof data === 'string' ? data : (data?.text as string ?? data?.output as string ?? '');

  // Finalize any streaming line
  const lines = outputLines.value.get(agent);
  const streamingLine = lines?.find(l => l.isStreaming && l.agentName === agent);

  if (streamingLine) {
    streamingLine.content = text || streamingLine.content;
    streamingLine.isStreaming = false;
    streamingLine.type = 'complete';
    streamingLine.timestamp = event.timestamp;
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
});

ws.on('agent_output', (event: ShazamEvent) => {
  const agent = event.agent ?? 'unknown';
  const data = event.data as Record<string, unknown> | string | null;
  const text = typeof data === 'string' ? data : (data?.text as string ?? data?.output as string ?? '');

  // Finalize streaming
  const lines = outputLines.value.get(agent);
  const streamingLine = lines?.find(l => l.isStreaming && l.agentName === agent);

  if (streamingLine) {
    streamingLine.content = text || streamingLine.content;
    streamingLine.isStreaming = false;
    streamingLine.timestamp = event.timestamp;
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
});

ws.on('tool_use', (event: ShazamEvent) => {
  const agent = event.agent ?? 'unknown';
  const data = event.data as Record<string, unknown> | null;
  const toolName = (data?.tool_name ?? data?.name ?? 'unknown') as string;
  const input = data?.input ?? data?.arguments;
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
});

ws.on('tool_result', (event: ShazamEvent) => {
  const agent = event.agent ?? 'unknown';
  const data = event.data as Record<string, unknown> | string | null;
  const toolName = typeof data === 'object' ? (data?.tool_name ?? data?.name ?? '') as string : '';
  const result = typeof data === 'string' ? data : (data?.result ?? data?.output ?? data?.content ?? '');
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
});

// Track task events for context
const TASK_EVENTS = ['task_started', 'task_completed', 'task_failed', 'task_created', 'task_status_change'];
for (const eventType of TASK_EVENTS) {
  ws.on(eventType, (event: ShazamEvent) => {
    const agent = event.agent;
    if (!agent) return;
    const data = event.data as Record<string, unknown> | null;
    const title = (data?.title ?? data?.task_id ?? event.task_id ?? '') as string;
    const status = (data?.status ?? data?.to ?? eventType.replace('task_', '')) as string;

    addLine(agent, {
      id: nextLineId(),
      type: eventType === 'task_failed' ? 'error' : 'task_info',
      content: `Task ${title}: ${status}`,
      timestamp: event.timestamp,
      agentName: agent,
      taskId: event.task_id,
    });
  });
}

// ─── Lifecycle ──────────────────────────────────────
onMounted(async () => {
  await loadCompanies();
  if (activeCompany.value?.name) {
    await agentStore.load(activeCompany.value.name);
  }
  // Auto-select first agent
  if (agents.value.length > 0 && !selectedAgent.value) {
    selectedAgent.value = agents.value[0]!.name;
  }
});

watch(() => activeCompany.value?.name, async (name) => {
  if (name) await agentStore.load(name);
});

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
</script>

<template>
  <div class="agent-output-page flex h-[calc(100vh-4rem)] gap-4">
    <!-- Agent List Sidebar -->
    <div class="w-64 shrink-0 overflow-y-auto rounded-2xl border border-gray-800 bg-surface-card p-3">
      <h2 class="mb-3 text-sm font-semibold text-white tracking-wide uppercase">Agents</h2>

      <div v-if="agents.length === 0" class="py-8 text-center text-xs text-gray-500">
        No agents loaded
      </div>

      <div class="space-y-1">
        <button
          v-for="agent in agents"
          :key="agent.name"
          class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-150"
          :class="selectedAgent === agent.name
            ? 'bg-shazam-500/15 border border-shazam-500/30 text-white'
            : 'hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-transparent'"
          @click="selectAgent(agent.name)"
        >
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :class="getStatusColor(agent.status)"
          />
          <div class="min-w-0 flex-1">
            <div class="truncate text-xs font-medium">{{ agent.name }}</div>
            <div class="truncate text-[10px] text-gray-500">{{ agent.role }}</div>
          </div>
          <span
            v-if="agentHasOutput[agent.name]"
            class="shrink-0 rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400"
          >
            {{ agentHasOutput[agent.name] }}
          </span>
        </button>
      </div>
    </div>

    <!-- Terminal Output -->
    <div class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-800 bg-surface-card">
      <!-- Terminal Header -->
      <div class="flex items-center justify-between border-b border-gray-800 px-4 py-2.5 bg-gray-900/60">
        <div class="flex items-center gap-3">
          <!-- Traffic lights -->
          <div class="flex gap-1.5">
            <span class="h-3 w-3 rounded-full bg-red-500/80" />
            <span class="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span class="h-3 w-3 rounded-full bg-green-500/80" />
          </div>

          <div v-if="currentAgent" class="flex items-center gap-2">
            <span class="text-sm font-semibold text-white">{{ currentAgent.name }}</span>
            <span class="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
              {{ currentAgent.role }}
            </span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-medium"
              :class="{
                'bg-emerald-500/15 text-emerald-400': currentAgent.status === 'idle',
                'bg-shazam-500/15 text-shazam-400': ['busy', 'working', 'executing'].includes(currentAgent.status),
                'bg-red-500/15 text-red-400': currentAgent.status === 'error',
                'bg-gray-700/40 text-gray-500': currentAgent.status === 'offline',
                'bg-yellow-500/15 text-yellow-400': ['waiting', 'paused'].includes(currentAgent.status),
              }"
            >
              {{ currentAgent.status }}
            </span>
          </div>
          <span v-else class="text-sm text-gray-500">Select an agent</span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Task badge -->
          <span
            v-if="currentTask"
            class="rounded-lg bg-shazam-500/10 px-2 py-1 text-[10px] font-mono text-shazam-400"
          >
            task: {{ currentTask }}
          </span>

          <!-- Auto-scroll indicator -->
          <button
            class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
            :class="{ 'text-shazam-400': autoScroll }"
            title="Auto-scroll"
            @click="autoScroll = !autoScroll; if (autoScroll) scrollToBottom()"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          <!-- Clear -->
          <button
            class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
            title="Clear output"
            @click="clearOutput"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Terminal Body -->
      <div
        ref="terminalRef"
        class="flex-1 overflow-y-auto bg-gray-950 p-3 font-mono text-xs leading-relaxed scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800"
        @scroll="handleScroll"
      >
        <div v-if="!selectedAgent" class="flex h-full items-center justify-center text-gray-600">
          <div class="text-center">
            <svg class="mx-auto mb-3 h-12 w-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p class="text-sm">Select an agent to view output</p>
          </div>
        </div>

        <div v-else-if="currentLines.length === 0" class="flex h-full items-center justify-center text-gray-600">
          <div class="text-center">
            <div class="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/60">
              <span class="text-base">...</span>
            </div>
            <p class="text-sm">Waiting for output from {{ selectedAgent }}</p>
          </div>
        </div>

        <template v-else>
          <TransitionGroup
            name="line"
            tag="div"
            class="space-y-0.5"
          >
            <div
              v-for="line in currentLines"
              :key="line.id"
              class="group"
            >
              <!-- Standard line -->
              <div
                class="flex gap-2 rounded px-2 py-0.5 hover:bg-gray-900/60"
                :class="{ 'animate-pulse': line.isStreaming }"
              >
                <span class="shrink-0 w-16 text-gray-600 select-none">{{ formatTime(line.timestamp) }}</span>
                <span class="shrink-0 w-3 select-none" :class="getLineColor(line.type)">{{ getLinePrefix(line.type) }}</span>
                <span class="flex-1 break-words whitespace-pre-wrap" :class="getLineColor(line.type)">
                  {{ line.content }}
                  <span v-if="line.isStreaming" class="inline-block h-3 w-1.5 animate-pulse bg-shazam-400 ml-0.5" />
                </span>

                <!-- Tool expand button -->
                <button
                  v-if="line.type === 'tool_use' || line.type === 'tool_result'"
                  class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-gray-600 hover:text-gray-300"
                  @click="toggleTool(line.id)"
                >
                  <svg
                    class="h-3.5 w-3.5 transition-transform duration-200"
                    :class="{ 'rotate-90': expandedTools.has(line.id) }"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>

              <!-- Collapsible tool details -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-96"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 max-h-96"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="expandedTools.has(line.id) && (line.toolInput || line.toolResult)"
                  class="ml-[5.5rem] mt-1 mb-2 overflow-hidden rounded-lg border border-gray-800 bg-gray-900/80"
                >
                  <div v-if="line.toolInput" class="border-b border-gray-800 p-2">
                    <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Input</div>
                    <pre class="text-[10px] text-purple-300/80 whitespace-pre-wrap break-all">{{ line.toolInput }}</pre>
                  </div>
                  <div v-if="line.toolResult" class="p-2">
                    <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Result</div>
                    <pre class="text-[10px] text-cyan-300/80 whitespace-pre-wrap break-all">{{ line.toolResult }}</pre>
                  </div>
                </div>
              </Transition>
            </div>
          </TransitionGroup>
        </template>
      </div>

      <!-- Bottom status bar -->
      <div class="flex items-center justify-between border-t border-gray-800 bg-gray-900/40 px-4 py-1.5 text-[10px] text-gray-500">
        <span>{{ currentLines.length }} lines</span>
        <span v-if="currentAgent">
          model: {{ currentAgent.model ?? 'default' }} | budget: {{ currentAgent.budget }}
        </span>
        <span>
          <span class="inline-block h-1.5 w-1.5 rounded-full mr-1" :class="ws.isConnected.value ? 'bg-emerald-500' : 'bg-red-500'" />
          {{ ws.isConnected.value ? 'connected' : 'disconnected' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-enter-active {
  transition: all 0.15s ease-out;
}
.line-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}
.line-leave-active {
  transition: all 0.1s ease-in;
}
.line-leave-to {
  opacity: 0;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgb(55 65 81 / 0.5);
  border-radius: 9999px;
}
</style>
