<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { VueFlow, useVueFlow, type Connection } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import type { Node, Edge } from '@vue-flow/core';
import dagre from 'dagre';

import AgentNode from '@/components/canvas/AgentNode.vue';
import TaskNode from '@/components/canvas/TaskNode.vue';
import StatsNode from '@/components/canvas/StatsNode.vue';
import EventFeedNode from '@/components/canvas/EventFeedNode.vue';
import GitNode from '@/components/canvas/GitNode.vue';
import BudgetNode from '@/components/canvas/BudgetNode.vue';
import QuickTaskNode from '@/components/canvas/QuickTaskNode.vue';
import ApprovalQueueNode from '@/components/canvas/ApprovalQueueNode.vue';
import AgentOutputTile from '@/components/canvas/AgentOutputTile.vue';
import AgentContextMenu from '@/components/canvas/AgentContextMenu.vue';
import DomainGroupNode from '@/components/canvas/DomainGroupNode.vue';
import FileDiffTile from '@/components/canvas/FileDiffTile.vue';

import { useActiveCompany } from '@/composables/useActiveCompany';
import { useWebSocket } from '@/composables/useWebSocket';
import { useAgentStore } from '@/stores/agents';
import { fetchTasks, approveTask, rejectTask, approveAllTasks, createTask } from '@/api/taskService';
import { get } from '@/api/http';

const { activeCompany } = useActiveCompany();
const ws = useWebSocket();
const agentStore = useAgentStore();
const { fitView } = useVueFlow();

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
const showTasks = ref(true);
const showStats = ref(true);
const showEvents = ref(true);
const showGit = ref(true);
const showBudget = ref(true);
const isLoading = ref(false);
const hasInitialized = ref(false);
const isFullscreen = ref(false);

// Agent output tracking
const expandedAgent = ref<string | null>(null);
const showDiffAgent = ref<string | null>(null);
const contextMenu = ref<{ agent: string; x: number; y: number } | null>(null);
const agentFileDiffs = ref<Record<string, Array<{ path: string; diffs: Array<{ type: 'add' | 'remove' | 'context'; text: string }> }>>>({});
const showDomainGroups = ref(true);
const agentOutputs = ref<Record<string, Array<{ time: string; type: string; text: string }>>>({});

// Floating panel data (reactive, not canvas nodes)
const statsData = ref({ totalTasks: 0, pending: 0, running: 0, completed: 0, failed: 0, cost: '<$0.01' });
const gitData = ref({ branch: '', status: '' });
const budgetData = ref<{ agents: Array<{ name: string; used: number; total: number }>; totalCost: string }>({ agents: [], totalCost: '<$0.01' });
const approvalTasks = ref<Array<{ id: string; title: string; assignedTo: string }>>([]);

// Live events buffer
const liveEvents = ref<Array<{ time: string; agent: string; text: string; type: string }>>([]);

// Debounced rebuild — max once per 2 seconds
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedRebuild() {
  if (rebuildTimer) return; // Already scheduled
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    buildCanvas();
  }, 2000);
}

const IMPORTANT_EVENTS = new Set([
  'task_created', 'task_completed', 'task_failed', 'task_started',
  'task_approved', 'task_rejected', 'task_killed', 'agent_status_change',
]);

ws.on('*' as any, (event: any) => {
  if (['heartbeat', 'metrics_updated'].includes(event.type)) return;

  // Add to live feed
  liveEvents.value = [
    { time: event.timestamp?.slice(0, 8) || '', agent: event.agent || 'system', text: event.data?.title || event.type, type: event.type },
    ...liveEvents.value.slice(0, 30),
  ];

  // Update event feed node reactively
  const eventNode = nodes.value.find(n => n.id === 'events');
  if (eventNode) {
    eventNode.data = { events: liveEvents.value };
  }

  // Track file changes per agent (for diff tile)
  const agentName = event.agent || 'system';
  if (event.type === 'tool_use' && agentName !== 'system') {
    const text = event.data?.title || '';
    const editMatch = text.match(/(?:Edit|Write)\s*[:(]?\s*["']?([^"'\s)]+)/);
    if (editMatch) {
      if (!agentFileDiffs.value[agentName]) agentFileDiffs.value[agentName] = [];
      const existing = agentFileDiffs.value[agentName].find(f => f.path === editMatch[1]);
      if (!existing) {
        agentFileDiffs.value[agentName] = [
          ...agentFileDiffs.value[agentName].slice(-5),
          { path: editMatch[1], diffs: [{ type: 'add' as const, text: 'Modified by ' + agentName }] },
        ];
      }
    }
  }

  // Track agent-specific output
  if (agentName !== 'system' && ['tool_use', 'agent_output', 'task_created', 'task_completed', 'task_failed', 'task_started'].includes(event.type)) {
    if (!agentOutputs.value[agentName]) {
      agentOutputs.value[agentName] = [];
    }
    agentOutputs.value[agentName] = [
      ...agentOutputs.value[agentName].slice(-50),
      { time: event.timestamp?.slice(0, 8) || '', type: event.type, text: event.data?.title || event.type },
    ];
  }

  // Debounced full rebuild for task/agent changes
  if (IMPORTANT_EVENTS.has(event.type)) {
    debouncedRebuild();
  }
});

async function buildCanvas() {
  isLoading.value = true;
  const company = activeCompany.value?.name;
  if (!company) { isLoading.value = false; return; }

  // Load agents from API + apply hierarchy overrides from localStorage
  await agentStore.load(company);
  let agents = applyOverrides(agentStore.agents);

  // Filter out agents with no name (daemon bug — agents got zeroed)
  agents = agents.filter(a => a.name && a.name !== 'unknown' && a.name !== '');

  const taskResult = await fetchTasks({ company });
  const tasks = taskResult.items;

  const newNodes: Node[] = [];
  const newEdges: Edge[] = [];

  // ── Update floating panel data ───────────
  statsData.value = {
    totalTasks: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    running: tasks.filter(t => ['in_progress', 'running'].includes(t.status)).length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    cost: '<$0.01',
  };

  try {
    const health = await get<any>('/health');
    gitData.value = { branch: health?.git_branch || '', status: health?.git_status || '' };
  } catch { /* ignore */ }

  budgetData.value = {
    agents: agents.map(a => ({ name: a.name, used: (a as any).tokens_used || 0, total: a.budget || 100000 })),
    totalCost: '<$0.01',
  };

  approvalTasks.value = tasks
    .filter(t => t.status === 'awaiting_approval')
    .map(t => ({ id: t.id, title: t.title, assignedTo: t.assigned_to || '' }));

  // ── Agent nodes ─────────────────────────
  const domains = new Set<string>();
  agents.forEach((agent) => {
    const currentTask = tasks.find(t =>
      t.assigned_to === agent.name && ['in_progress', 'running'].includes(t.status)
    );
    const domain = (agent as any).domain || null;
    if (domain) domains.add(domain);

    newNodes.push({
      id: `agent-${agent.name}`, type: 'agent', position: { x: 0, y: 0 },
      data: {
        name: agent.name,
        role: agent.role || '',
        status: agent.status || 'idle',
        domain,
        currentTask: currentTask?.title || null,
        tasksCompleted: (agent as any).tasks_completed || 0,
        tasksFailed: (agent as any).tasks_failed || 0,
        tasksPending: tasks.filter(t => t.assigned_to === agent.name && t.status === 'pending').length,
        tasksRunning: tasks.filter(t => t.assigned_to === agent.name && ['in_progress', 'running'].includes(t.status)).length,
      },
    });
  });

  // ── Domain group nodes ───────────────────
  if (showDomainGroups.value && domains.size > 0) {
    const domainColors: Record<string, string> = {
      core: '#a855f7', dashboard: '#3b82f6', app: '#10b981', api: '#f59e0b',
      cli: '#ef4444', vscode: '#06b6d4', web: '#ec4899', mobile: '#8b5cf6',
    };
    let domainIdx = 0;
    const defaultColors = ['#6366f1', '#14b8a6', '#f97316', '#e11d48', '#0ea5e9'];
    domains.forEach(domain => {
      const color = domainColors[domain.toLowerCase()] || defaultColors[domainIdx++ % defaultColors.length];
      const agentCount = agents.filter(a => (a as any).domain === domain).length;
      newNodes.push({
        id: `domain-${domain}`,
        type: 'domainGroup',
        position: { x: 0, y: 0 },
        data: { domain, agentCount, color },
        style: { zIndex: -1 },
      } as any);
    });
  }

  // ── Hierarchy edges ─────────────────────
  agents.forEach((agent) => {
    const supervisor = (agent as any).supervisor;
    if (supervisor && agents.find(a => a.name === supervisor)) {
      newEdges.push({
        id: `edge-${supervisor}-${agent.name}`,
        source: `agent-${supervisor}`,
        target: `agent-${agent.name}`,
        type: 'smoothstep',
        style: { stroke: '#4b5563', strokeWidth: 2 },
      });
    }
  });

  // ── Task nodes ──────────────────────────
  if (showTasks.value) {
    // Always include tasks assigned to active agents + all non-completed tasks
    const activeAgentNames = new Set(agents.map(a => a.name));
    const activeTasks = tasks.filter(t =>
      ['pending', 'in_progress', 'running', 'awaiting_approval', 'failed'].includes(t.status) ||
      (t.assigned_to && activeAgentNames.has(t.assigned_to) && t.status === 'in_progress')
    );
    // Dedupe and limit
    const seen = new Set<string>();
    const uniqueTasks = activeTasks.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; }).slice(0, 25);

    uniqueTasks.forEach((task) => {
      newNodes.push({
        id: `task-${task.id}`, type: 'task', position: { x: 0, y: 0 },
        data: { id: task.id, title: task.title, status: task.status, assignedTo: task.assigned_to || 'unassigned' },
      });
      if (task.assigned_to && agents.find(a => a.name === task.assigned_to)) {
        newEdges.push({
          id: `edge-task-${task.id}`,
          source: `agent-${task.assigned_to}`,
          target: `task-${task.id}`,
          type: 'smoothstep',
          animated: task.status === 'in_progress',
          style: {
            stroke: task.status === 'in_progress' ? '#60a5fa' : task.status === 'awaiting_approval' ? '#fbbf24' : task.status === 'failed' ? '#ef4444' : '#4b5563',
            strokeWidth: 1.5,
            strokeDasharray: task.status === 'awaiting_approval' ? '5,5' : undefined,
          },
        });
      }
    });
  }

  // ── Auto layout ─────────────────────────
  layoutNodes(newNodes, newEdges);

  // Apply saved layout positions (override dagre)
  applyLayout(newNodes);

  nodes.value = newNodes;
  edges.value = newEdges;
  isLoading.value = false;
  if (!hasInitialized.value) {
    hasInitialized.value = true;
    setTimeout(() => fitView({ padding: 0.15 }), 100);
  }
}

function layoutNodes(allNodes: Node[], allEdges: Edge[]) {
  const hierarchyNodes = allNodes;
  const hierarchyEdges = allEdges;

  // Layout hierarchy with dagre
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 40, marginy: 40 });

  hierarchyNodes.forEach((node) => {
    const w = node.type === 'agent' ? 210 : 190;
    const h = node.type === 'agent' ? 130 : 80;
    g.setNode(node.id, { width: w, height: h });
  });
  const nodeIds = new Set(hierarchyNodes.map(n => n.id));
  hierarchyEdges.forEach((edge) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });
  dagre.layout(g);

  hierarchyNodes.forEach((node) => {
    const pos = g.node(node.id);
    if (pos) node.position = { x: pos.x - (pos.width || 0) / 2, y: pos.y - (pos.height || 0) / 2 };
  });

}

function onAgentContextMenu(agentName: string, event: MouseEvent) {
  event.preventDefault();
  contextMenu.value = { agent: agentName, x: event.clientX, y: event.clientY };
}

function toggleAgentOutput(agentName: string) {
  expandedAgent.value = expandedAgent.value === agentName ? null : agentName;
}

async function handleApprove(id: string) { await approveTask(id); buildCanvas(); }
async function handleReject(id: string) { await rejectTask(id); buildCanvas(); }
async function handleApproveAll() { await approveAllTasks(); buildCanvas(); }
async function handleCreateTask(title: string) {
  const company = activeCompany.value?.name;
  if (!company) return;
  await createTask(company, { title, description: title });
  buildCanvas();
}

// ── Hierarchy overrides (localStorage + daemon) ──────────

function getOverridesKey(): string {
  return `shazam-canvas-overrides-${activeCompany.value?.name || 'default'}`;
}

function getLayoutKey(): string {
  return `shazam-canvas-layout-${activeCompany.value?.name || 'default'}`;
}

function saveLayout() {
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.value.forEach(n => { positions[n.id] = n.position; });
  localStorage.setItem(getLayoutKey(), JSON.stringify(positions));
}

function applyLayout(nodes: Node[]) {
  try {
    const saved = JSON.parse(localStorage.getItem(getLayoutKey()) || '{}');
    nodes.forEach(n => {
      if (saved[n.id]) {
        n.position = saved[n.id];
      }
    });
  } catch { /* ignore */ }
}

function loadOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(getOverridesKey()) || '{}');
  } catch { return {}; }
}

function saveOverride(agentName: string, supervisorName: string) {
  const overrides = loadOverrides();
  overrides[agentName] = supervisorName;
  localStorage.setItem(getOverridesKey(), JSON.stringify(overrides));
}

function applyOverrides(agents: any[]): any[] {
  const overrides = loadOverrides();
  return agents.map(a => {
    const override = overrides[a.name];
    if (override !== undefined) {
      return { ...a, supervisor: override };
    }
    return a;
  });
}

// Handle edge reconnection — change agent hierarchy
async function onConnect(connection: Connection) {
  if (!connection.source || !connection.target) return;

  const sourceId = connection.source;
  const targetId = connection.target;

  // Agent-to-agent: change hierarchy
  // Agent-to-task or task-to-agent: reassign task
  const isAgentToAgent = sourceId.startsWith('agent-') && targetId.startsWith('agent-');
  const isAgentToTask = sourceId.startsWith('agent-') && targetId.startsWith('task-');

  if (isAgentToTask) {
    // Reassign task to this agent
    const agentName = sourceId.replace('agent-', '');
    const taskId = targetId.replace('task-', '');
    try {
      const { post: httpPost } = await import('@/api/http');
      await httpPost(`/tasks/${encodeURIComponent(taskId)}/reassign`, { assigned_to: agentName });
    } catch { /* best effort */ }
    debouncedRebuild();
    return;
  }

  if (!isAgentToAgent) return;

  const supervisorName = sourceId.replace('agent-', '');
  const agentName = targetId.replace('agent-', '');
  const company = activeCompany.value?.name;
  if (!company) return;

  // Prevent cycles: check if supervisorName is a descendant of agentName
  const wouldCycle = (agent: string, visited = new Set<string>()): boolean => {
    if (visited.has(agent)) return true;
    visited.add(agent);
    // Check current edges for who this agent supervises
    const subordinates = (edges.value as any[])
      .filter((e: any) => e.source === `agent-${agent}` && !e.id.includes('task'))
      .map((e: any) => e.target.replace('agent-', ''));
    return subordinates.some(sub => sub === agentName || wouldCycle(sub, visited));
  };

  if (agentName === supervisorName || wouldCycle(supervisorName)) {
    console.warn('[Canvas] Cycle detected — cannot make', agentName, 'report to', supervisorName);
    return;
  }

  // Save to localStorage (instant, survives F5)
  saveOverride(agentName, supervisorName);

  // Remove ALL old hierarchy edges pointing to this agent (not task edges)
  const filtered = (edges.value as any[]).filter((e: any) => {
    // Keep task edges
    if (e.id.includes('task')) return true;
    // Remove any hierarchy edge where this agent is the target
    if (e.target === targetId) return false;
    return true;
  });
  // Add the single new hierarchy edge
  filtered.push({
    id: `edge-${supervisorName}-${agentName}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
    style: { stroke: '#4b5563', strokeWidth: 2 },
  } as any);
  edges.value = filtered;

  // Try to update daemon in background (best effort, don't rebuild)
  try {
    const { put } = await import('@/api/http');
    put(`/companies/${encodeURIComponent(company)}/agents/${encodeURIComponent(agentName)}`, {
      supervisor: supervisorName,
    }).catch(() => {});
  } catch { /* localStorage has it anyway */ }
}

function onEdgeUpdate({ edge, connection }: { edge: any; connection: Connection }) {
  if (!connection.source || !connection.target) return;
  edges.value = (edges.value as any[]).filter((e: any) => e.id !== edge.id) as any;
  onConnect(connection);
}

watch(() => activeCompany.value?.name, (n, o) => { if (n && n !== o) { liveEvents.value = []; hasInitialized.value = false; buildCanvas(); } });
onMounted(buildCanvas);
</script>

<template>
  <div class="h-full flex flex-col" :class="isFullscreen ? 'fixed inset-0 z-50 bg-gray-950' : ''"  >
    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-medium text-gray-300">Canvas</h2>
        <span v-if="isLoading" class="text-xs text-gray-500">Loading...</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <label v-for="toggle in [
          { model: showTasks, label: 'Tasks' },
          { model: showStats, label: 'Stats' },
          { model: showEvents, label: 'Events' },
          { model: showGit, label: 'Git' },
          { model: showBudget, label: 'Budget' },
          { model: showDomainGroups, label: 'Domains' },
        ]" :key="toggle.label" class="flex items-center gap-1 text-[11px] text-gray-400 cursor-pointer">
          <input v-model="toggle.model" type="checkbox" class="rounded border-gray-600 h-3 w-3" @change="buildCanvas" />
          {{ toggle.label }}
        </label>
        <button class="rounded-lg bg-gray-800 px-2.5 py-1 text-[11px] text-gray-400 hover:text-white" @click="buildCanvas">↻</button>
        <button class="rounded-lg bg-gray-800 px-2.5 py-1 text-[11px] text-gray-400 hover:text-white" @click="fitView({ padding: 0.15 })">⊞</button>
        <button class="rounded-lg bg-gray-800 px-2.5 py-1 text-[11px] text-gray-400 hover:text-white" @click="isFullscreen = !isFullscreen">{{ isFullscreen ? '⊟' : '⛶' }}</button>
      </div>
    </div>

    <div class="flex-1 relative">
      <!-- Canvas -->
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :default-viewport="{ x: 0, y: 0, zoom: 0.7 }"
        :min-zoom="0.15"
        :max-zoom="2.5"
        fit-view-on-init
        :connect-on-click="true"
        :edges-updatable="true"
        class="bg-gray-950"
        @connect="onConnect"
        @edge-update="onEdgeUpdate"
        @node-drag-stop="saveLayout"
      >
        <template #node-agent="{ data }">
          <div @dblclick.stop="toggleAgentOutput(data.name)" @contextmenu.prevent.stop="onAgentContextMenu(data.name, $event)">
            <AgentNode :data="data" />
            <AgentOutputTile
              :agent-name="data.name"
              :is-expanded="expandedAgent === data.name"
              :lines="agentOutputs[data.name] || []"
              @close="expandedAgent = null"
            />
            <FileDiffTile
              :agent-name="data.name"
              :is-expanded="showDiffAgent === data.name"
              :files="agentFileDiffs[data.name] || []"
              @close="showDiffAgent = null"
            />
          </div>
        </template>
        <template #node-task="{ data }"><TaskNode :data="data" @approve="handleApprove" @reject="handleReject" /></template>
        <template #node-domainGroup="{ data }"><DomainGroupNode :data="data" /></template>

        <Background pattern-color="#1f2937" :gap="20" />
        <Controls position="bottom-left" />
        <MiniMap pannable zoomable node-color="#374151" mask-color="rgba(0,0,0,0.7)" />
      </VueFlow>

      <!-- Agent Context Menu -->
      <div v-if="contextMenu" class="fixed inset-0 z-40" @click="contextMenu = null" @contextmenu.prevent="contextMenu = null" />
      <AgentContextMenu
        v-if="contextMenu"
        :agent-name="contextMenu.agent"
        :x="contextMenu.x"
        :y="contextMenu.y"
        @close="contextMenu = null"
        @view-output="toggleAgentOutput"
        @pause-agent="() => { /* TODO */ }"
        @remove-agent="() => { /* TODO */ }"
        @view-config="(name: string) => { showDiffAgent = showDiffAgent === name ? null : name; }"
      />

      <!-- Floating panels (fixed position, always visible) -->

      <!-- Left panel: QuickTask + Approvals + Events -->
      <div class="absolute top-3 left-3 flex flex-col gap-3 z-10 pointer-events-auto max-w-[280px] max-h-[calc(100%-80px)] overflow-y-auto scrollbar-none">
        <QuickTaskNode :data="{ companyName: activeCompany?.name || '' }" @create="handleCreateTask" />
        <ApprovalQueueNode
          v-if="approvalTasks.length > 0"
          :data="{ tasks: approvalTasks }"
          @approve="handleApprove"
          @reject="handleReject"
          @approve-all="handleApproveAll"
        />
        <EventFeedNode v-if="showEvents" :data="{ events: liveEvents }" />
      </div>

      <!-- Right panel: Stats + Git + Budget -->
      <div class="absolute top-3 right-3 flex flex-col gap-3 z-10 pointer-events-auto max-w-[230px]">
        <StatsNode v-if="showStats" :data="statsData" />
        <GitNode v-if="showGit" :data="gitData" />
        <BudgetNode v-if="showBudget" :data="budgetData" />
      </div>

    </div>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.vue-flow__minimap { border-radius: 8px; border: 1px solid #374151; background: #111827; }
.vue-flow__controls { border-radius: 8px; border: 1px solid #374151; background: #1f2937; }
.vue-flow__controls-button { background: #1f2937; border-color: #374151; color: #9ca3af; }
.vue-flow__controls-button:hover { background: #374151; color: white; }
</style>
